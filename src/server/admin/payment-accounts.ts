"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { Prisma } from "@/generated/prisma/client";
import { uploadPaymentAccountImage } from "@/lib/cloudinary";
import {
  paymentAccountFormSchema,
  paymentAccountIdSchema,
  type PaymentAccountFormInput,
} from "@/lib/payment-account-admin";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Server Action manajemen rekening tujuan transfer manual (PRD §5.3 fitur 9).
// Setiap mutasi melewati guard Super Admin, validasi Zod ulang (AGENTS.md
// aturan 1), dan menulis AuditLog dalam transaksi yang sama (aturan 9).
// Rekening bersifat global; gambar QRIS opsional diunggah lewat Cloudinary.
// Rekening yang sudah dipakai pembayaran tidak dihapus permanen — dinonaktifkan
// agar riwayat pembayaran tetap utuh.

export type PaymentAccountFormPayload = PaymentAccountFormInput & {
  image?: File | null;
  removeImage?: boolean;
};

export type PaymentAccountActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function paymentAccountAuditMetadata(account: PaymentAccountFormInput) {
  return {
    type: account.type,
    providerName: account.providerName,
    accountNumber: account.accountNumber,
    accountHolder: account.accountHolder,
    sortOrder: account.sortOrder,
    isActive: account.isActive,
  };
}

function isForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export async function createPaymentAccount(
  payload: PaymentAccountFormPayload,
): Promise<PaymentAccountActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = paymentAccountFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data rekening pembayaran.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  let imageUrl: string | null = null;
  if (payload.image) {
    const upload = await uploadPaymentAccountImage(payload.image);

    if (!upload.ok) {
      return {
        ok: false,
        message: upload.message,
        fieldErrors: { image: upload.message },
      };
    }

    imageUrl = upload.url;
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentAccount.create({
        data: {
          type: data.type,
          providerName: data.providerName,
          accountNumber: data.accountNumber,
          accountHolder: data.accountHolder,
          imageUrl,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
        select: { id: true },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.PAYMENT_ACCOUNT_CREATED,
        entity: AUDIT_ENTITY.PAYMENT_ACCOUNT,
        entityId: created.id,
        metadata: paymentAccountAuditMetadata(data),
      });

      return created;
    });

    revalidatePath("/admin/pembayaran");

    return {
      ok: true,
      message: "Rekening pembayaran berhasil dibuat.",
      id: account.id,
    };
  } catch (error) {
    console.error("[payment-account] gagal membuat rekening pembayaran", error);

    return {
      ok: false,
      message: "Gagal menyimpan rekening pembayaran. Coba lagi sebentar lagi.",
    };
  }
}

export async function updatePaymentAccount(
  id: string,
  payload: PaymentAccountFormPayload,
): Promise<PaymentAccountActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = paymentAccountIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Rekening pembayaran tidak valid." };
  }

  const parsed = paymentAccountFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data rekening pembayaran.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = await prisma.paymentAccount.findUnique({
    where: { id: idParsed.data },
    select: { id: true, imageUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Rekening pembayaran tidak ditemukan." };
  }

  let imageUrl = existing.imageUrl;
  if (payload.image) {
    const upload = await uploadPaymentAccountImage(payload.image);

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

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentAccount.update({
        where: { id: existing.id },
        data: {
          type: data.type,
          providerName: data.providerName,
          accountNumber: data.accountNumber,
          accountHolder: data.accountHolder,
          imageUrl,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.PAYMENT_ACCOUNT_UPDATED,
        entity: AUDIT_ENTITY.PAYMENT_ACCOUNT,
        entityId: existing.id,
        metadata: {
          ...paymentAccountAuditMetadata(data),
          imageChanged: Boolean(payload.image) || Boolean(payload.removeImage),
        },
      });
    });

    revalidatePath("/admin/pembayaran");
    revalidatePath(`/admin/pembayaran/${existing.id}`);

    return {
      ok: true,
      message: "Rekening pembayaran berhasil diperbarui.",
      id: existing.id,
    };
  } catch (error) {
    console.error(
      "[payment-account] gagal memperbarui rekening pembayaran",
      error,
    );

    return {
      ok: false,
      message: "Gagal menyimpan rekening pembayaran. Coba lagi sebentar lagi.",
    };
  }
}

export async function setPaymentAccountActive(
  id: string,
  isActive: boolean,
): Promise<PaymentAccountActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = paymentAccountIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Rekening pembayaran tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.paymentAccount.findUnique({
        where: { id: idParsed.data },
        select: { id: true, providerName: true, isActive: true },
      });

      if (!account) return null;
      if (account.isActive === isActive) return { id: account.id };

      await tx.paymentAccount.update({
        where: { id: account.id },
        data: { isActive },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.PAYMENT_ACCOUNT_UPDATED,
        entity: AUDIT_ENTITY.PAYMENT_ACCOUNT,
        entityId: account.id,
        metadata: {
          providerName: account.providerName,
          isActive,
          change: "STATUS",
        },
      });

      return { id: account.id };
    });

    if (!result) {
      return { ok: false, message: "Rekening pembayaran tidak ditemukan." };
    }

    revalidatePath("/admin/pembayaran");
    revalidatePath(`/admin/pembayaran/${result.id}`);

    return {
      ok: true,
      id: result.id,
      message: isActive
        ? "Rekening pembayaran diaktifkan."
        : "Rekening pembayaran dinonaktifkan.",
    };
  } catch (error) {
    console.error(
      "[payment-account] gagal mengubah status rekening pembayaran",
      error,
    );

    return {
      ok: false,
      message:
        "Gagal mengubah status rekening pembayaran. Coba lagi sebentar lagi.",
    };
  }
}

export async function deletePaymentAccount(
  id: string,
): Promise<PaymentAccountActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = paymentAccountIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Rekening pembayaran tidak valid." };
  }

  const account = await prisma.paymentAccount.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      providerName: true,
      _count: { select: { payments: true } },
    },
  });

  if (!account) {
    return { ok: false, message: "Rekening pembayaran tidak ditemukan." };
  }

  if (account._count.payments > 0) {
    return {
      ok: false,
      message:
        "Rekening sudah dipakai pada pembayaran pesanan. Nonaktifkan saja agar riwayat tetap utuh.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentAccount.delete({ where: { id: account.id } });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.PAYMENT_ACCOUNT_DELETED,
        entity: AUDIT_ENTITY.PAYMENT_ACCOUNT,
        entityId: account.id,
        metadata: { providerName: account.providerName },
      });
    });

    revalidatePath("/admin/pembayaran");

    return {
      ok: true,
      message: "Rekening pembayaran berhasil dihapus.",
      id: account.id,
    };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        message:
          "Rekening sudah dipakai pada pembayaran pesanan. Nonaktifkan saja agar riwayat tetap utuh.",
      };
    }

    console.error(
      "[payment-account] gagal menghapus rekening pembayaran",
      error,
    );

    return {
      ok: false,
      message: "Gagal menghapus rekening pembayaran. Coba lagi sebentar lagi.",
    };
  }
}
