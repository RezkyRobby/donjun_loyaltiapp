import { VoucherStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  getRewardAvailability,
  type RewardAvailability,
} from "@/lib/reward-availability";

// Katalog promo pelanggan (PRD §5.1 fitur 5). Promo bersifat global lintas
// outlet, sehingga tidak difilter per outlet.
//
// Kuota dan limit klaim hanya dihitung dari voucher yang belum dibatalkan
// (ACTIVE/USED); voucher CANCELED mengembalikan poin sehingga kuota dan limit
// pelanggan kembali tersedia (PRD §8.5).
const COUNTED_VOUCHER_STATUSES = [VoucherStatus.ACTIVE, VoucherStatus.USED];

export type CatalogReward = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  perUserLimit: number | null;
  startAt: Date | null;
  endAt: Date | null;
  terms: string | null;
  availability: RewardAvailability;
};

// Hanya reward aktif yang ditampilkan; kelayakan penukaran (periode, kuota,
// limit, saldo) dihitung per pelanggan.
export async function getCustomerRewardCatalog(
  userId: string,
  now: Date = new Date(),
): Promise<CatalogReward[]> {
  const [user, rewards, userClaims] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    }),
    prisma.rewardCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ pointsCost: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        pointsCost: true,
        quota: true,
        perUserLimit: true,
        startAt: true,
        endAt: true,
        terms: true,
        isActive: true,
        _count: {
          select: {
            vouchers: { where: { status: { in: COUNTED_VOUCHER_STATUSES } } },
          },
        },
      },
    }),
    prisma.voucher.groupBy({
      by: ["rewardId"],
      where: { userId, status: { in: COUNTED_VOUCHER_STATUSES } },
      _count: { _all: true },
    }),
  ]);

  const pointsBalance = user?.pointsBalance ?? 0;
  const claimedByUser = new Map(
    userClaims.map((row) => [row.rewardId, row._count._all]),
  );

  return rewards.map((reward) => ({
    id: reward.id,
    title: reward.title,
    description: reward.description,
    imageUrl: reward.imageUrl,
    pointsCost: reward.pointsCost,
    perUserLimit: reward.perUserLimit,
    startAt: reward.startAt,
    endAt: reward.endAt,
    terms: reward.terms,
    availability: getRewardAvailability({
      isActive: reward.isActive,
      pointsCost: reward.pointsCost,
      quota: reward.quota,
      perUserLimit: reward.perUserLimit,
      startAt: reward.startAt,
      endAt: reward.endAt,
      pointsBalance,
      claimedCount: reward._count.vouchers,
      claimedByUserCount: claimedByUser.get(reward.id) ?? 0,
      now,
    }),
  }));
}
