import type { Prisma } from "@/generated/prisma/client";
import { VoucherStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getRemainingQuota } from "@/lib/reward-availability";

// Kueri daftar reward untuk backoffice (PRD §5.3 fitur 2). Kuota terpakai hanya
// menghitung voucher yang belum dibatalkan — sejalan dengan perhitungan katalog
// pelanggan dan penukaran (voucher CANCELED mengembalikan kuota).

const COUNTED_VOUCHER_STATUSES = [VoucherStatus.ACTIVE, VoucherStatus.USED];

export type AdminReward = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  quota: number | null;
  perUserLimit: number | null;
  startAt: Date | null;
  endAt: Date | null;
  terms: string | null;
  isActive: boolean;
  claimedCount: number;
  remainingQuota: number | null;
};

const rewardSelect = {
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
} satisfies Prisma.RewardCatalogSelect;

type RewardRow = Prisma.RewardCatalogGetPayload<{ select: typeof rewardSelect }>;

function toAdminReward(row: RewardRow): AdminReward {
  const claimedCount = row._count.vouchers;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    pointsCost: row.pointsCost,
    quota: row.quota,
    perUserLimit: row.perUserLimit,
    startAt: row.startAt,
    endAt: row.endAt,
    terms: row.terms,
    isActive: row.isActive,
    claimedCount,
    remainingQuota: getRemainingQuota(row.quota, claimedCount),
  };
}

export async function getAdminRewards(): Promise<AdminReward[]> {
  const rows = await prisma.rewardCatalog.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: rewardSelect,
  });

  return rows.map(toAdminReward);
}

export async function getAdminRewardById(
  id: string,
): Promise<AdminReward | null> {
  const row = await prisma.rewardCatalog.findUnique({
    where: { id },
    select: rewardSelect,
  });

  return row ? toAdminReward(row) : null;
}
