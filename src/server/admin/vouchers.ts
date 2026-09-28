"use server";

import {
  PointTransactionMethod,
  PointTransactionType,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import {
  isWithinRevertWindow,
  voucherCorrectionSchema,
  type VoucherCorrectionInput,
} from "@/lib/correction";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Pembatalan & koreksi voucher oleh Super Admin (PRD §5.3 fitur 5, §8.5).
// Seluruh perubahan status memakai pembaruan kondisional di dalam
// `prisma.$transaction` sehingga pembatalan/revert tidak pernah balapan dengan
// validasi kasir atau permintaan lain (AGENTS.md aturan 3). Setiap aksi
// meninggalkan jejak pada PointTransaction (bila poin berubah) dan AuditLog.

export type CancelVoucherErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "NOT_FOUND"
  | "NOT_ACTIVE"
  | "ERROR";

export type CancelVoucherResult =
  | {
      ok: true;
      voucherCode: string;
      pointsRefunded: number;
      pointsBalance: number;
    }
  | { ok: false; code: CancelVoucherErrorCode; message: string };

export type RevertVoucherErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "NOT_FOUND"
  | "NOT_USED"
  | "OUT_OF_WINDOW"
  | "ERROR";

export type RevertVoucherResult =
  | { ok: true; voucherCode: string }
  | { ok: false; code: RevertVoucherErrorCode; message: string };

// Pembatalan voucher `ACTIVE`: status menjadi `CANCELED`, poin yang dibelanjakan
// dikembalikan sebagai transaksi `REVERSAL`, dan alasan wajib terekam (PRD §8.5
// langkah 2). Voucher `USED`/`CANCELED` tidak dapat dibatalkan.
export async function cancelVoucher(
  input: VoucherCorrectionInput,
): Promise<CancelVoucherResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const parsed = voucherCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Periksa kembali kode voucher dan alasan pembatalan.",
    };
  }

  const { voucherCode, reason } = parsed.data;

  try {
    return await prisma.$transaction(
      async (tx): Promise<CancelVoucherResult> => {
        const voucher = await tx.voucher.findUnique({
          where: { voucherCode },
          select: {
            id: true,
            userId: true,
            status: true,
            pointsSpent: true,
            rewardTitle: true,
          },
        });

        if (!voucher) {
          return {
            ok: false,
            code: "NOT_FOUND",
            message: "Kode voucher tidak ditemukan.",
          };
        }

        if (voucher.status === VoucherStatus.USED) {
          return {
            ok: false,
            code: "NOT_ACTIVE",
            message:
              "Voucher sudah terpakai. Gunakan koreksi validasi untuk mengembalikannya ke aktif.",
          };
        }

        if (voucher.status === VoucherStatus.CANCELED) {
          return {
            ok: false,
            code: "NOT_ACTIVE",
            message: "Voucher sudah dibatalkan sebelumnya.",
          };
        }

        // Pembaruan kondisional: hanya berhasil bila voucher masih ACTIVE,
        // sehingga dua pembatalan bersamaan tidak menggandakan pengembalian.
        const canceledAt = new Date();
        const canceled = await tx.voucher.updateMany({
          where: { id: voucher.id, status: VoucherStatus.ACTIVE },
          data: {
            status: VoucherStatus.CANCELED,
            canceledAt,
            cancelReason: reason,
          },
        });

        if (canceled.count === 0) {
          return {
            ok: false,
            code: "NOT_ACTIVE",
            message: "Voucher tidak lagi berstatus aktif.",
          };
        }

        const customer = await tx.user.update({
          where: { id: voucher.userId },
          data: { pointsBalance: { increment: voucher.pointsSpent } },
          select: { pointsBalance: true },
        });

        await tx.pointTransaction.create({
          data: {
            customerId: voucher.userId,
            cashierId: actorId,
            type: PointTransactionType.REVERSAL,
            amount: voucher.pointsSpent,
            method: PointTransactionMethod.ADMIN,
            voucherId: voucher.id,
            note: reason,
          },
        });

        await recordAuditLog(tx, {
          actorId,
          action: AUDIT_ACTION.VOUCHER_CANCELED,
          entity: AUDIT_ENTITY.VOUCHER,
          entityId: voucher.id,
          metadata: {
            voucherCode,
            rewardTitle: voucher.rewardTitle,
            pointsRefunded: voucher.pointsSpent,
            reason,
          },
        });

        return {
          ok: true,
          voucherCode,
          pointsRefunded: voucher.pointsSpent,
          pointsBalance: customer.pointsBalance,
        };
      },
    );
  } catch (error) {
    console.error("[pembatalan-voucher] gagal membatalkan voucher", error);

    return {
      ok: false,
      code: "ERROR",
      message: "Gagal membatalkan voucher. Coba lagi sebentar lagi.",
    };
  }
}

// Koreksi kesalahan validasi: kembalikan voucher dari `USED` ke `ACTIVE` maksimal
// 1x24 jam setelah `usedAt`, dengan alasan wajib (PRD §8.5 langkah 3). Tidak ada
// mutasi poin karena validasi tidak pernah memotong saldo — cukup AuditLog.
export async function revertVoucherUsage(
  input: VoucherCorrectionInput,
): Promise<RevertVoucherResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const parsed = voucherCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Periksa kembali kode voucher dan alasan koreksi.",
    };
  }

  const { voucherCode, reason } = parsed.data;

  try {
    return await prisma.$transaction(
      async (tx): Promise<RevertVoucherResult> => {
        const voucher = await tx.voucher.findUnique({
          where: { voucherCode },
          select: {
            id: true,
            status: true,
            usedAt: true,
            rewardTitle: true,
          },
        });

        if (!voucher) {
          return {
            ok: false,
            code: "NOT_FOUND",
            message: "Kode voucher tidak ditemukan.",
          };
        }

        if (voucher.status !== VoucherStatus.USED || !voucher.usedAt) {
          return {
            ok: false,
            code: "NOT_USED",
            message: "Hanya voucher berstatus terpakai yang dapat dikoreksi.",
          };
        }

        const now = new Date();

        if (!isWithinRevertWindow(voucher.usedAt, now)) {
          return {
            ok: false,
            code: "OUT_OF_WINDOW",
            message:
              "Koreksi validasi hanya dapat dilakukan maksimal 1x24 jam setelah voucher terpakai. Gunakan koreksi saldo manual untuk pengembalian poin.",
          };
        }

        // Pembaruan kondisional `WHERE status = 'USED'` menjamin hanya satu
        // revert yang berhasil bila permintaan datang bersamaan (AGENTS.md
        // aturan 3).
        const reverted = await tx.voucher.updateMany({
          where: { id: voucher.id, status: VoucherStatus.USED },
          data: {
            status: VoucherStatus.ACTIVE,
            usedAt: null,
            usedByCashierId: null,
            usedAtOutletId: null,
          },
        });

        if (reverted.count === 0) {
          return {
            ok: false,
            code: "NOT_USED",
            message: "Voucher tidak lagi berstatus terpakai.",
          };
        }

        await recordAuditLog(tx, {
          actorId,
          action: AUDIT_ACTION.VOUCHER_REVERTED,
          entity: AUDIT_ENTITY.VOUCHER,
          entityId: voucher.id,
          metadata: {
            voucherCode,
            rewardTitle: voucher.rewardTitle,
            previousUsedAt: voucher.usedAt.toISOString(),
            reason,
          },
        });

        return { ok: true, voucherCode };
      },
    );
  } catch (error) {
    console.error("[revert-voucher] gagal mengoreksi validasi voucher", error);

    return {
      ok: false,
      code: "ERROR",
      message: "Gagal mengoreksi voucher. Coba lagi sebentar lagi.",
    };
  }
}
