"use server";

import { Prisma } from "@/generated/prisma/client";
import {
  PointTransactionMethod,
  PointTransactionType,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { redeemRewardSchema, type RedeemRewardInput } from "@/lib/redemption";
import {
  getRemainingQuota,
  isWithinActivePeriod,
} from "@/lib/reward-availability";
import { generateVoucherCode } from "@/lib/voucher-code";
import { getSession } from "@/server/auth/session";

// Server Action penukaran poin (PRD §8.4). Seluruh mutasi (saldo, voucher, dan
// PointTransaction) dijalankan dalam satu transaksi interaktif pada isolasi
// Serializable agar kuota dan limit per pelanggan tetap akurat saat permintaan
// bersamaan (AGENTS.md aturan 3; pengerasan lanjutan pada Task 22).
export type RedeemRewardResult =
  | { ok: true; voucherCode: string }
  | { ok: false; message: string };

// Kuota dan limit klaim hanya menghitung voucher yang belum dibatalkan.
const COUNTED_VOUCHER_STATUSES = [VoucherStatus.ACTIVE, VoucherStatus.USED];

// Percobaan ulang untuk tabrakan kode voucher (P2002) dan konflik serialisasi
// (P2034) di bawah isolasi Serializable.
const MAX_PERCOBAAN = 5;

function isUniqueVoucherCodeError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function redeemReward(
  input: RedeemRewardInput,
): Promise<RedeemRewardResult> {
  const session = await getSession();

  if (!session || session.user.role !== UserRole.CUSTOMER) {
    return {
      ok: false,
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const parsed = redeemRewardSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Permintaan penukaran tidak valid." };
  }

  const { rewardId } = parsed.data;
  const userId = session.user.id;
  const now = new Date();

  for (let attempt = 1; attempt <= MAX_PERCOBAAN; attempt += 1) {
    const voucherCode = generateVoucherCode();

    try {
      const result = await prisma.$transaction(
        async (tx): Promise<RedeemRewardResult> => {
          const reward = await tx.rewardCatalog.findUnique({
            where: { id: rewardId },
          });

          if (!reward || !reward.isActive) {
            return {
              ok: false,
              message: "Promo tidak ditemukan atau sudah tidak aktif.",
            };
          }

          if (!isWithinActivePeriod(reward.startAt, reward.endAt, now)) {
            return { ok: false, message: "Promo sedang di luar periode aktif." };
          }

          const [claimedCount, claimedByUserCount] = await Promise.all([
            tx.voucher.count({
              where: { rewardId, status: { in: COUNTED_VOUCHER_STATUSES } },
            }),
            tx.voucher.count({
              where: {
                rewardId,
                userId,
                status: { in: COUNTED_VOUCHER_STATUSES },
              },
            }),
          ]);

          const remainingQuota = getRemainingQuota(reward.quota, claimedCount);

          if (remainingQuota !== null && remainingQuota <= 0) {
            return { ok: false, message: "Kuota promo sudah habis." };
          }

          if (
            reward.perUserLimit !== null &&
            claimedByUserCount >= reward.perUserLimit
          ) {
            return {
              ok: false,
              message: "Batas klaim Anda untuk promo ini sudah tercapai.",
            };
          }

          // Pemotongan saldo kondisional: hanya berhasil bila saldo mencukupi,
          // sehingga saldo tidak pernah negatif (AGENTS.md aturan 3).
          const debit = await tx.user.updateMany({
            where: { id: userId, pointsBalance: { gte: reward.pointsCost } },
            data: { pointsBalance: { decrement: reward.pointsCost } },
          });

          if (debit.count === 0) {
            return {
              ok: false,
              message: "Poin Anda tidak mencukupi untuk menukar promo ini.",
            };
          }

          const voucher = await tx.voucher.create({
            data: {
              voucherCode,
              userId,
              rewardId,
              pointsSpent: reward.pointsCost,
              // Snapshot judul reward agar riwayat tetap utuh (PRD §5.3 fitur 2).
              rewardTitle: reward.title,
              status: VoucherStatus.ACTIVE,
            },
            select: { id: true, voucherCode: true },
          });

          await tx.pointTransaction.create({
            data: {
              customerId: userId,
              type: PointTransactionType.REDEEM,
              amount: -reward.pointsCost,
              // Penukaran mandiri dari aplikasi pelanggan, bukan oleh petugas.
              method: PointTransactionMethod.SYSTEM,
              voucherId: voucher.id,
            },
          });

          return { ok: true, voucherCode: voucher.voucherCode };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return result;
    } catch (error) {
      if (isUniqueVoucherCodeError(error) || isTransactionConflict(error)) {
        continue;
      }

      console.error("[penukaran] gagal menukar poin", error);

      return {
        ok: false,
        message: "Gagal menukar poin. Coba lagi sebentar lagi.",
      };
    }
  }

  return {
    ok: false,
    message: "Sistem sedang sibuk. Coba lagi sebentar lagi.",
  };
}
