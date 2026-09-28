import type { PointTransactionMethod } from "@/generated/prisma/enums";
import { PointTransactionType } from "@/generated/prisma/enums";
import { endOfDayWita, startOfDayWita } from "@/lib/datetime";
import { DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

// Riwayat injeksi kasir (PRD §5.2 fitur 6): daftar injeksi poin yang dilakukan
// kasir yang sedang login pada hari berjalan menurut zona WITA (PRD §9). Hanya
// menyertakan identitas pelanggan seperlunya — nama dan username (PRD §10).
export type CashierInjection = {
  id: string;
  amount: number;
  method: PointTransactionMethod | null;
  createdAt: Date;
  customerName: string;
  customerUsername: string | null;
  outletName: string | null;
};

export type CashierInjectionPage = {
  injections: CashierInjection[];
  page: number;
  totalPages: number;
  total: number;
};

export async function getTodayCashierInjections(
  cashierId: string,
  page = 1,
): Promise<CashierInjectionPage> {
  const where = {
    cashierId,
    type: PointTransactionType.EARN,
    createdAt: { gte: startOfDayWita(), lt: endOfDayWita() },
  };

  const [rows, total] = await Promise.all([
    prisma.pointTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        customer: { select: { name: true, username: true } },
        outlet: { select: { name: true } },
      },
    }),
    prisma.pointTransaction.count({ where }),
  ]);

  return {
    injections: rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      method: row.method,
      createdAt: row.createdAt,
      customerName: row.customer.name,
      customerUsername: row.customer.username,
      outletName: row.outlet?.name ?? null,
    })),
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}
