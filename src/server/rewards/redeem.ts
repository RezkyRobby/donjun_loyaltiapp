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
  getRewardAvailability,
  type RewardUnavailableReason,
} from "@/lib/reward-availability";
import { generateVoucherCode } from "@/lib/voucher-code";
import { getSession } from "@/server/auth/session";

// Server Action penukaran poin (PRD §8.4). Seluruh mutasi (saldo, voucher, dan
// PointTransaction) dijalankan dalam satu transaksi interaktif pada isolasi
// Serializable agar kuota dan limit per pelanggan tetap akurat saat permintaan
// bersamaan (AGENTS.md aturan 3). Pemeriksaan kelayakan memakai
// `getRewardAvailability` yang sama dengan katalog, sehingga server menolak
// dengan alasan identik seperti di klien (PRD §8.4).
export type RedeemRewardResult =
  | { ok: true; voucherCode: string }
  | { ok: false; message: string };

// Kuota dan limit klaim hanya menghitung voucher yang belum dibatalkan.
const COUNTED_VOUCHER_STATUSES = [VoucherStatus.ACTIVE, VoucherStatus.USED];

// Percobaan ulang untuk tabrakan kode voucher (P2002) dan konflik serialisasi
// (P2034) di bawah isolasi Serializable.
const MAX_PERCOBAAN = 5;

// Pesan penolakan per alasan kelayakan (PRD §8.4 edge case: server menolak
// dengan alasan yang sama seperti yang ditampilkan klien).
const UNAVAILABLE_MESSAGES: Record<RewardUnavailableReason, string> = {
  INACTIVE: "Promo tidak ditemukan atau sudah tidak aktif.",
  OUT_OF_PERIOD: "Promo sedang di luar periode aktif.",
  QUOTA_EXHAUSTED: "Kuota promo sudah habis.",
  USER_LIMIT_REACHED: "Batas klaim Anda untuk promo ini sudah tercapai.",
  INSUFFICIENT_POINTS: "Poin Anda tidak mencukupi untuk menukar promo ini.",
};

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

  for (let attempt = 1; attempt <= MAX_PERCOBAAN; attempt += 1) {
    const voucherCode = generateVoucherCode();

    try {
      const result = await prisma.$transaction(
        async (tx): Promise<RedeemRewardResult> => {
          // Akun pelanggan dibaca ulang di dalam transaksi: status suspend dan
          // peran dapat berubah kapan pun, dan penukaran poin diblokir untuk
          // akun yang ditangguhkan (PRD §5.3 fitur 5, §8.3).
          const customer = await tx.user.findUnique({
            where: { id: userId },
            select: { role: true, isActive: true, pointsBalance: true },
          });

          if (!customer || customer.role !== UserRole.CUSTOMER) {
            return {
              ok: false,
              message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
            };
          }

          if (!customer.isActive) {
            return {
              ok: false,
              message:
                "Akun Anda sedang ditangguhkan sehingga tidak dapat menukar poin.",
            };
          }

          const reward = await tx.rewardCatalog.findUnique({
            where: { id: rewardId },
          });

          if (!reward) {
            return {
              ok: false,
              message: "Promo tidak ditemukan atau sudah tidak aktif.",
            };
          }

          // Kuota dan limit dihitung dari jumlah voucher terkini di dalam
          // transaksi; perubahan bersamaan dideteksi sebagai konflik
          // serialisasi dan dicoba ulang (kuota atomik).
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

          const { canRedeem, reason } = getRewardAvailability({
            isActive: reward.isActive,
            pointsCost: reward.pointsCost,
            quota: reward.quota,
            perUserLimit: reward.perUserLimit,
            startAt: reward.startAt,
            endAt: reward.endAt,
            pointsBalance: customer.pointsBalance,
            claimedCount,
            claimedByUserCount,
            now: new Date(),
          });

          if (!canRedeem && reason) {
            return { ok: false, message: UNAVAILABLE_MESSAGES[reason] };
          }

          // Pemotongan saldo kondisional: hanya berhasil bila saldo mencukupi,
          // sehingga saldo tidak pernah negatif meski ada permintaan bersamaan
          // (AGENTS.md aturan 3). Pembaruan ini juga menjadi kunci baris
          // pelanggan sehingga saldo dibaca dan dipotong secara konsisten.
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
