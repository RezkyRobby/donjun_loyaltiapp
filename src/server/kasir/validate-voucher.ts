"use server";

import { UserRole, VoucherStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isUserRole } from "@/lib/rbac";
import { voucherCodeSchema } from "@/lib/voucher-code";
import { getSession } from "@/server/auth/session";
import {
  checkVoucherValidationLimit,
  describeVoucherRateLimit,
  recordVoucherValidationFailure,
} from "@/server/kasir/voucher-validation-limit";

// Server Action validasi voucher (PRD §5.2 fitur 4–5, §8.4 langkah 7). Perubahan
// status dijalankan sebagai pembaruan kondisional atomik (`WHERE status =
// ACTIVE`) sehingga dua pemindaian bersamaan tidak mungkin berhasil dua kali
// (AGENTS.md aturan 3). Kegagalan validasi dibatasi 10 percobaan/menit per kasir
// untuk mencegah enumerasi kode (PRD §9).
export type ValidateVoucherErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "NO_OUTLET"
  | "NOT_FOUND"
  | "USED"
  | "CANCELED"
  | "RATE_LIMITED"
  | "ERROR";

export type ValidateVoucherResult =
  | { ok: true; voucherCode: string; rewardTitle: string; usedAt: Date }
  | {
      ok: false;
      code: ValidateVoucherErrorCode;
      message: string;
      usedAt?: Date;
      retryAfterSeconds?: number;
    };

export async function validateVoucher(
  input: unknown,
): Promise<ValidateVoucherResult> {
  const session = await getSession();

  if (!session || !isUserRole(session.user.role)) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const role = session.user.role;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const cashierId = session.user.id;
  const rateLimit = checkVoucherValidationLimit(cashierId);

  // Kegagalan beruntun diblokir lebih awal agar percobaan enumerasi tidak
  // menyentuh database (PRD §9, §14).
  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: describeVoucherRateLimit(rateLimit.retryAfterSeconds),
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  const recordFailure = () => recordVoucherValidationFailure(cashierId);

  const parsed = voucherCodeSchema.safeParse(input);
  if (!parsed.success) {
    recordFailure();

    return {
      ok: false,
      code: "INVALID",
      message: "Format kode voucher tidak dikenali.",
    };
  }

  const voucherCode = parsed.data;

  try {
    const cashier = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { outletId: true },
    });
    const outletId = cashier?.outletId ?? null;

    // Validasi voucher merekam outlet pelaksana (PRD §8.4 langkah 7).
    if (!outletId) {
      return {
        ok: false,
        code: "NO_OUTLET",
        message:
          "Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin sebelum memvalidasi voucher.",
      };
    }

    const voucher = await prisma.voucher.findUnique({
      where: { voucherCode },
      select: {
        id: true,
        status: true,
        rewardTitle: true,
        usedAt: true,
      },
    });

    if (!voucher) {
      recordFailure();

      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Kode voucher tidak ditemukan.",
      };
    }

    if (voucher.status === VoucherStatus.CANCELED) {
      recordFailure();

      return {
        ok: false,
        code: "CANCELED",
        message: "Voucher telah dibatalkan dan tidak dapat digunakan.",
      };
    }

    if (voucher.status === VoucherStatus.USED) {
      recordFailure();

      return {
        ok: false,
        code: "USED",
        message: "Voucher sudah pernah terpakai.",
        usedAt: voucher.usedAt ?? undefined,
      };
    }

    const usedAt = new Date();
    const updated = await prisma.voucher.updateMany({
      where: { id: voucher.id, status: VoucherStatus.ACTIVE },
      data: {
        status: VoucherStatus.USED,
        usedAt,
        usedByCashierId: session.user.id,
        usedAtOutletId: outletId,
      },
    });

    // count 0 berarti permintaan bersamaan lebih dulu memakai/membatalkan
    // voucher ini; baca status terbaru untuk pesan yang tepat.
    if (updated.count === 0) {
      const latest = await prisma.voucher.findUnique({
        where: { id: voucher.id },
        select: { status: true, usedAt: true },
      });

      if (latest?.status === VoucherStatus.USED) {
        recordFailure();

        return {
          ok: false,
          code: "USED",
          message: "Voucher sudah pernah terpakai.",
          usedAt: latest.usedAt ?? undefined,
        };
      }

      recordFailure();

      return {
        ok: false,
        code: "CANCELED",
        message: "Voucher telah dibatalkan dan tidak dapat digunakan.",
      };
    }

    return { ok: true, voucherCode, rewardTitle: voucher.rewardTitle, usedAt };
  } catch (error) {
    console.error("[validasi-voucher] gagal memvalidasi voucher", error);

    return {
      ok: false,
      code: "ERROR",
      message: "Gagal memvalidasi voucher. Coba lagi sebentar lagi.",
    };
  }
}
