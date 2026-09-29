import type { Prisma } from "@/generated/prisma/client";
import {
  PointTransactionType,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { computeRedemptionRate, LOYAL_CUSTOMERS_LIMIT } from "@/lib/analytics";
import { endOfMonthWita, startOfMonthWita } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

// Kueri Dashboard Analitik Toko (PRD §5.3 fitur 1). Seluruh agregasi periode
// memakai batas bulan WITA (PRD §9). Anggota dan poin bersifat global lintas
// outlet (AGENTS.md) sehingga tidak dipengaruhi filter outlet; filter outlet
// diterapkan pada laporan operasional, di sini daftar pelanggan paling loyal
// (diurutkan dari poin `EARN` di outlet terpilih).

export type LoyalCustomer = {
  id: string;
  name: string;
  username: string | null;
  pointsEarned: number;
};

export type AnalyticsDashboard = {
  totalMembers: number;
  circulatingPoints: number;
  monthlyRedemption: {
    issued: number;
    used: number;
    rate: number | null;
  };
  loyalCustomers: LoyalCustomer[];
};

export type OutletOption = {
  id: string;
  name: string;
};

// Pilihan filter outlet: hanya outlet aktif, diurutkan agar mudah dipindai.
export async function getOutletOptions(): Promise<OutletOption[]> {
  return prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getAnalyticsDashboard(
  outletId: string | null,
): Promise<AnalyticsDashboard> {
  const now = new Date();
  const monthStart = startOfMonthWita(now);
  const monthEnd = endOfMonthWita(now);

  const loyalWhere: Prisma.PointTransactionWhereInput = {
    type: PointTransactionType.EARN,
  };
  if (outletId) loyalWhere.outletId = outletId;

  const [totalMembers, pointsAggregate, issuedCount, usedCount, loyalGroups] =
    await Promise.all([
      // Total anggota terdaftar: seluruh akun pelanggan, termasuk yang sedang
      // ditangguhkan (tetap terdaftar sebagai anggota).
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      // Total poin beredar: jumlah bertanda seluruh transaksi poin — setara
      // dengan total saldo pelanggan. PRD §5.3 menuliskan EARN − REDEEM ± ADJUST;
      // REVERSAL (pengembalian poin saat pembatalan voucher) turut dihitung agar
      // angka mencerminkan poin beredar yang sebenarnya.
      prisma.pointTransaction.aggregate({ _sum: { amount: true } }),
      // Voucher diterbitkan pada bulan berjalan (dikelompokkan menurut `claimedAt`).
      prisma.voucher.count({
        where: { claimedAt: { gte: monthStart, lt: monthEnd } },
      }),
      // Voucher terpakai pada bulan berjalan (dikelompokkan menurut `usedAt`).
      prisma.voucher.count({
        where: {
          status: VoucherStatus.USED,
          usedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.pointTransaction.groupBy({
        by: ["customerId"],
        where: loyalWhere,
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: LOYAL_CUSTOMERS_LIMIT,
      }),
    ]);

  const loyalCustomerIds = loyalGroups.map((group) => group.customerId);
  const loyalUsers = loyalCustomerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: loyalCustomerIds }, role: UserRole.CUSTOMER },
        select: { id: true, name: true, username: true },
      })
    : [];
  const usersById = new Map(loyalUsers.map((user) => [user.id, user]));

  const loyalCustomers = loyalGroups.flatMap((group): LoyalCustomer[] => {
    const user = usersById.get(group.customerId);

    if (!user) return [];

    return [
      {
        id: user.id,
        name: user.name,
        username: user.username,
        pointsEarned: group._sum.amount ?? 0,
      },
    ];
  });

  return {
    totalMembers,
    circulatingPoints: pointsAggregate._sum.amount ?? 0,
    monthlyRedemption: {
      issued: issuedCount,
      used: usedCount,
      rate: computeRedemptionRate(usedCount, issuedCount),
    },
    loyalCustomers,
  };
}
