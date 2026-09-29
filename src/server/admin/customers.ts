"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { UserRole } from "@/generated/prisma/enums";
import { setCustomerActiveSchema } from "@/lib/customer-admin";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Penangguhan (suspend) & pengaktifan kembali akun pelanggan (PRD §5.3 fitur 5,
// §8.5). Akun ter-suspend tidak dapat login, menerima injeksi poin, atau
// menukarkan poin baru; voucher yang telah dimiliki tetap dapat digunakan.
// Menonaktifkan akun mencabut seluruh sesi berjalan seketika, dan setiap
// perubahan status terekam pada AuditLog (AGENTS.md aturan 9). Koreksi saldo
// (`ADJUST`) ditangani terpisah oleh `adjustCustomerPoints`.

export type CustomerActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string };

export async function setCustomerActive(
  id: string,
  isActive: boolean,
): Promise<CustomerActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = setCustomerActiveSchema.safeParse({ id, isActive });

  if (!parsed.success) {
    return { ok: false, message: "Pelanggan tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.user.findFirst({
        where: { id: parsed.data.id, role: UserRole.CUSTOMER },
        select: { id: true, isActive: true, username: true },
      });

      if (!customer) return null;
      if (customer.isActive === isActive) {
        return { id: customer.id, revoked: 0, changed: false };
      }

      await tx.user.update({
        where: { id: customer.id },
        data: { isActive: parsed.data.isActive },
      });

      // Penangguhan mencabut seluruh sesi berjalan agar akses langsung tertutup
      // (PRD §8.2 edge case).
      let revoked = 0;
      if (!isActive) {
        const deleted = await tx.session.deleteMany({
          where: { userId: customer.id },
        });
        revoked = deleted.count;
      }

      await recordAuditLog(tx, {
        actorId,
        action: isActive
          ? AUDIT_ACTION.CUSTOMER_REACTIVATED
          : AUDIT_ACTION.CUSTOMER_SUSPENDED,
        entity: AUDIT_ENTITY.USER,
        entityId: customer.id,
        metadata: {
          username: customer.username,
          isActive,
          revokedSessions: revoked,
        },
      });

      return { id: customer.id, revoked, changed: true };
    });

    if (!result) {
      return { ok: false, message: "Pelanggan tidak ditemukan." };
    }

    revalidatePath("/admin/pelanggan");
    revalidatePath(`/admin/pelanggan/${result.id}`);

    if (!result.changed) {
      return {
        ok: true,
        id: result.id,
        message: isActive
          ? "Akun pelanggan sudah aktif."
          : "Akun pelanggan sudah ditangguhkan.",
      };
    }

    return {
      ok: true,
      id: result.id,
      message: isActive
        ? "Akun pelanggan diaktifkan kembali."
        : "Akun pelanggan ditangguhkan dan seluruh sesinya dicabut.",
    };
  } catch (error) {
    console.error("[pelanggan] gagal mengubah status akun", error);

    return { ok: false, message: "Gagal mengubah status akun. Coba lagi." };
  }
}
