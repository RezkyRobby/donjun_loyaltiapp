"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { Prisma } from "@/generated/prisma/client";
import { uploadRewardImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import {
  rewardFormSchema,
  rewardIdSchema,
  toRewardPeriod,
} from "@/lib/reward-admin";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Server Action manajemen katalog reward (PRD §5.3 fitur 2). Setiap mutasi
// melewati guard Super Admin, validasi Zod ulang (AGENTS.md aturan 1), dan
// menulis AuditLog dalam transaksi yang sama (aturan 9). Reward yang sudah
// memiliki voucher tidak boleh dihapus permanen — diarahkan untuk dinonaktifkan
// agar snapshot judul pada voucher tetap utuh.

export type RewardFormPayload = {
  title: string;
  description: string;
  pointsCost: string;
  quota: string;
  perUserLimit: string;
  startAt: string;
  endAt: string;
  terms: string;
  isActive: boolean;
  image?: File | null;
  removeImage?: boolean;
};

export type RewardActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

type RewardAuditFields = {
  title: string;
  pointsCost: number;
  quota: number | null;
  perUserLimit: number | null;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
};

function rewardAuditMetadata(reward: RewardAuditFields) {
  return {
    title: reward.title,
    pointsCost: reward.pointsCost,
    quota: reward.quota,
    perUserLimit: reward.perUserLimit,
    startAt: reward.startAt ? reward.startAt.toISOString() : null,
    endAt: reward.endAt ? reward.endAt.toISOString() : null,
    isActive: reward.isActive,
  };
}

function isForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export async function createReward(
  payload: RewardFormPayload,
): Promise<RewardActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const parsed = rewardFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data reward.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  let imageUrl: string | null = null;
  if (payload.image) {
    const upload = await uploadRewardImage(payload.image);

    if (!upload.ok) {
      return {
        ok: false,
        message: upload.message,
        fieldErrors: { image: upload.message },
      };
    }

    imageUrl = upload.url;
  }

  const period = toRewardPeriod(data);

  try {
    const reward = await prisma.$transaction(async (tx) => {
      const created = await tx.rewardCatalog.create({
        data: {
          title: data.title,
          description: data.description,
          imageUrl,
          pointsCost: data.pointsCost,
          quota: data.quota,
          perUserLimit: data.perUserLimit,
          startAt: period.startAt,
          endAt: period.endAt,
          terms: data.terms,
          isActive: data.isActive,
        },
        select: { id: true },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.REWARD_CREATED,
        entity: AUDIT_ENTITY.REWARD,
        entityId: created.id,
        metadata: rewardAuditMetadata({ ...data, ...period }),
      });

      return created;
    });

    revalidatePath("/admin/reward");

    return { ok: true, message: "Reward berhasil dibuat.", id: reward.id };
  } catch (error) {
    console.error("[reward] gagal membuat reward", error);

    return {
      ok: false,
      message: "Gagal menyimpan reward. Coba lagi sebentar lagi.",
    };
  }
}

export async function updateReward(
  id: string,
  payload: RewardFormPayload,
): Promise<RewardActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const idParsed = rewardIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Reward tidak valid." };
  }

  const parsed = rewardFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data reward.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = await prisma.rewardCatalog.findUnique({
    where: { id: idParsed.data },
    select: { id: true, imageUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Reward tidak ditemukan." };
  }

  let imageUrl = existing.imageUrl;
  if (payload.image) {
    const upload = await uploadRewardImage(payload.image);

    if (!upload.ok) {
      return {
        ok: false,
        message: upload.message,
        fieldErrors: { image: upload.message },
      };
    }

    imageUrl = upload.url;
  } else if (payload.removeImage) {
    imageUrl = null;
  }

  const period = toRewardPeriod(data);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rewardCatalog.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          imageUrl,
          pointsCost: data.pointsCost,
          quota: data.quota,
          perUserLimit: data.perUserLimit,
          startAt: period.startAt,
          endAt: period.endAt,
          terms: data.terms,
          isActive: data.isActive,
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.REWARD_UPDATED,
        entity: AUDIT_ENTITY.REWARD,
        entityId: existing.id,
        metadata: {
          ...rewardAuditMetadata({ ...data, ...period }),
          imageChanged: Boolean(payload.image) || Boolean(payload.removeImage),
        },
      });
    });

    revalidatePath("/admin/reward");
    revalidatePath(`/admin/reward/${existing.id}`);

    return { ok: true, message: "Reward berhasil diperbarui.", id: existing.id };
  } catch (error) {
    console.error("[reward] gagal memperbarui reward", error);

    return {
      ok: false,
      message: "Gagal menyimpan reward. Coba lagi sebentar lagi.",
    };
  }
}

export async function setRewardActive(
  id: string,
  isActive: boolean,
): Promise<RewardActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const idParsed = rewardIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Reward tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.rewardCatalog.findUnique({
        where: { id: idParsed.data },
        select: { id: true, title: true, isActive: true },
      });

      if (!reward) return null;
      if (reward.isActive === isActive) return { id: reward.id };

      await tx.rewardCatalog.update({
        where: { id: reward.id },
        data: { isActive },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.REWARD_UPDATED,
        entity: AUDIT_ENTITY.REWARD,
        entityId: reward.id,
        metadata: { title: reward.title, isActive },
      });

      return { id: reward.id };
    });

    if (!result) {
      return { ok: false, message: "Reward tidak ditemukan." };
    }

    revalidatePath("/admin/reward");
    revalidatePath(`/admin/reward/${result.id}`);

    return {
      ok: true,
      message: isActive ? "Reward diaktifkan." : "Reward dinonaktifkan.",
      id: result.id,
    };
  } catch (error) {
    console.error("[reward] gagal mengubah status reward", error);

    return {
      ok: false,
      message: "Gagal mengubah status reward. Coba lagi sebentar lagi.",
    };
  }
}

export async function deleteReward(id: string): Promise<RewardActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const idParsed = rewardIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Reward tidak valid." };
  }

  const reward = await prisma.rewardCatalog.findUnique({
    where: { id: idParsed.data },
    select: { id: true, title: true, _count: { select: { vouchers: true } } },
  });

  if (!reward) {
    return { ok: false, message: "Reward tidak ditemukan." };
  }

  if (reward._count.vouchers > 0) {
    return {
      ok: false,
      message:
        "Reward sudah memiliki voucher terkait. Nonaktifkan saja agar riwayat voucher tetap utuh.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rewardCatalog.delete({ where: { id: reward.id } });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.REWARD_DELETED,
        entity: AUDIT_ENTITY.REWARD,
        entityId: reward.id,
        metadata: { title: reward.title },
      });
    });

    revalidatePath("/admin/reward");

    return { ok: true, message: "Reward berhasil dihapus.", id: reward.id };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        message:
          "Reward sudah memiliki voucher terkait. Nonaktifkan saja agar riwayat voucher tetap utuh.",
      };
    }

    console.error("[reward] gagal menghapus reward", error);

    return {
      ok: false,
      message: "Gagal menghapus reward. Coba lagi sebentar lagi.",
    };
  }
}
