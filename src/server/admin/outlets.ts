"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { Prisma } from "@/generated/prisma/client";
import {
  outletFormSchema,
  outletIdSchema,
  type OutletFormInput,
} from "@/lib/outlet-admin";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";
import { countOutletReferences } from "@/server/admin/outlet-list";

// Server Action manajemen outlet (PRD §5.3 fitur 6). Setiap mutasi melewati guard
// Super Admin, validasi Zod ulang (AGENTS.md aturan 1), dan menulis AuditLog
// dalam transaksi yang sama (aturan 9). Outlet yang telah dipakai kasir atau
// transaksi tidak boleh dihapus permanen — cukup dinonaktifkan agar riwayat tetap
// utuh.

export type OutletActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function outletAuditMetadata(outlet: OutletFormInput) {
  return {
    name: outlet.name,
    address: outlet.address,
    phone: outlet.phone,
    isActive: outlet.isActive,
  };
}

export async function createOutlet(
  input: OutletFormInput,
): Promise<OutletActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = outletFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data outlet.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    const outlet = await prisma.$transaction(async (tx) => {
      const created = await tx.outlet.create({
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          isActive: data.isActive,
        },
        select: { id: true },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.OUTLET_CREATED,
        entity: AUDIT_ENTITY.OUTLET,
        entityId: created.id,
        metadata: outletAuditMetadata(data),
      });

      return created;
    });

    revalidatePath("/admin/outlet");

    return { ok: true, id: outlet.id, message: "Outlet berhasil dibuat." };
  } catch (error) {
    console.error("[outlet] gagal membuat outlet", error);

    return {
      ok: false,
      message: "Gagal menyimpan outlet. Coba lagi sebentar lagi.",
    };
  }
}

export async function updateOutlet(
  id: string,
  input: OutletFormInput,
): Promise<OutletActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = outletIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Outlet tidak valid." };
  }

  const parsed = outletFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data outlet.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const existing = await prisma.outlet.findUnique({
    where: { id: idParsed.data },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, message: "Outlet tidak ditemukan." };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.outlet.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          isActive: data.isActive,
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.OUTLET_UPDATED,
        entity: AUDIT_ENTITY.OUTLET,
        entityId: existing.id,
        metadata: outletAuditMetadata(data),
      });
    });

    revalidatePath("/admin/outlet");
    revalidatePath(`/admin/outlet/${existing.id}`);

    return { ok: true, id: existing.id, message: "Outlet berhasil diperbarui." };
  } catch (error) {
    console.error("[outlet] gagal memperbarui outlet", error);

    return {
      ok: false,
      message: "Gagal menyimpan outlet. Coba lagi sebentar lagi.",
    };
  }
}

export async function setOutletActive(
  id: string,
  isActive: boolean,
): Promise<OutletActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = outletIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Outlet tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findUnique({
        where: { id: idParsed.data },
        select: { id: true, name: true, isActive: true },
      });

      if (!outlet) return null;
      if (outlet.isActive === isActive) return { id: outlet.id };

      await tx.outlet.update({
        where: { id: outlet.id },
        data: { isActive },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.OUTLET_UPDATED,
        entity: AUDIT_ENTITY.OUTLET,
        entityId: outlet.id,
        metadata: { name: outlet.name, isActive, change: "STATUS" },
      });

      return { id: outlet.id };
    });

    if (!result) {
      return { ok: false, message: "Outlet tidak ditemukan." };
    }

    revalidatePath("/admin/outlet");
    revalidatePath(`/admin/outlet/${result.id}`);

    return {
      ok: true,
      id: result.id,
      message: isActive ? "Outlet diaktifkan." : "Outlet dinonaktifkan.",
    };
  } catch (error) {
    console.error("[outlet] gagal mengubah status outlet", error);

    return {
      ok: false,
      message: "Gagal mengubah status outlet. Coba lagi sebentar lagi.",
    };
  }
}

export async function deleteOutlet(id: string): Promise<OutletActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = outletIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Outlet tidak valid." };
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: idParsed.data },
    select: { id: true, name: true },
  });

  if (!outlet) {
    return { ok: false, message: "Outlet tidak ditemukan." };
  }

  const references = await countOutletReferences(outlet.id);

  if (references.staff + references.vouchers + references.transactions > 0) {
    return {
      ok: false,
      message:
        "Outlet sudah dipakai pada data operasional. Nonaktifkan saja agar riwayat tetap utuh.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.outlet.delete({ where: { id: outlet.id } });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.OUTLET_DELETED,
        entity: AUDIT_ENTITY.OUTLET,
        entityId: outlet.id,
        metadata: { name: outlet.name },
      });
    });

    revalidatePath("/admin/outlet");

    return { ok: true, id: outlet.id, message: "Outlet berhasil dihapus." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        ok: false,
        message:
          "Outlet sudah dipakai pada data operasional. Nonaktifkan saja agar riwayat tetap utuh.",
      };
    }

    console.error("[outlet] gagal menghapus outlet", error);

    return {
      ok: false,
      message: "Gagal menghapus outlet. Coba lagi sebentar lagi.",
    };
  }
}
