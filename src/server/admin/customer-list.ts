import type { Prisma } from "@/generated/prisma/client";
import {
  UserRole,
  type PointTransactionMethod,
  type PointTransactionType,
  type VoucherStatus,
} from "@/generated/prisma/enums";
import { customerAdminSearchSchema } from "@/lib/customer-admin";
import { escapeLikePattern } from "@/lib/customer-search";
import { DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

// Kueri manajemen pelanggan untuk backoffice (PRD §5.3 fitur 5). Pencarian
// mencakup nama, username, email, dan nomor telepon — data pribadi hanya
// terlihat Super Admin (PRD §10). Wildcard SQL (`%`, `_`) di-escape sebelum
// masuk ke kueri agar input tidak memperluas pola pencarian (AGENTS.md aturan 2).

export type AdminCustomerRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  pointsBalance: number;
  isActive: boolean;
  createdAt: Date;
};

export type AdminCustomerList = {
  customers: AdminCustomerRow[];
  page: number;
  totalPages: number;
  total: number;
};

export type AdminCustomerDetail = AdminCustomerRow & {
  emailVerified: boolean;
  image: string | null;
};

export type AdminPointHistoryRow = {
  id: string;
  type: PointTransactionType;
  amount: number;
  method: PointTransactionMethod | null;
  note: string | null;
  createdAt: Date;
  cashierName: string | null;
  outletName: string | null;
  voucherCode: string | null;
};

export type AdminPointHistoryPage = {
  entries: AdminPointHistoryRow[];
  page: number;
  totalPages: number;
  total: number;
};

export type AdminCustomerVoucher = {
  id: string;
  voucherCode: string;
  rewardTitle: string;
  status: VoucherStatus;
  claimedAt: Date;
  usedAt: Date | null;
};

const CUSTOMER_ROW_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  pointsBalance: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const CUSTOMER_DETAIL_SELECT = {
  ...CUSTOMER_ROW_SELECT,
  emailVerified: true,
  image: true,
} satisfies Prisma.UserSelect;

// Membangun klausa pencarian dari kata kunci yang sudah dinormalisasi. Nilai
// kosong berarti tanpa filter (menampilkan seluruh pelanggan).
function buildCustomerWhere(query: string): Prisma.UserWhereInput {
  const parsed = customerAdminSearchSchema.safeParse(query);
  const term = parsed.success ? parsed.data : "";

  const where: Prisma.UserWhereInput = { role: UserRole.CUSTOMER };

  if (!term) return where;

  const pattern = escapeLikePattern(term);

  where.OR = [
    { name: { contains: pattern, mode: "insensitive" } },
    { username: { contains: pattern, mode: "insensitive" } },
    { email: { contains: pattern, mode: "insensitive" } },
    { phone: { contains: pattern } },
  ];

  return where;
}

export async function getAdminCustomerList(
  query: string,
  page = 1,
): Promise<AdminCustomerList> {
  const where = buildCustomerWhere(query);

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: CUSTOMER_ROW_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    customers,
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}

export async function getAdminCustomerDetail(
  id: string,
): Promise<AdminCustomerDetail | null> {
  return prisma.user.findFirst({
    where: { id, role: UserRole.CUSTOMER },
    select: CUSTOMER_DETAIL_SELECT,
  });
}

// Riwayat poin pelanggan (PRD §5.3 fitur 5): setiap mutasi saldo beserta pelaku,
// outlet, dan voucher terkait. Terpaginasi server-side (NFR §9).
export async function getCustomerPointHistory(
  customerId: string,
  page = 1,
): Promise<AdminPointHistoryPage> {
  const where: Prisma.PointTransactionWhereInput = { customerId };

  const [rows, total] = await Promise.all([
    prisma.pointTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: {
        id: true,
        type: true,
        amount: true,
        method: true,
        note: true,
        createdAt: true,
        cashier: { select: { name: true } },
        outlet: { select: { name: true } },
        voucher: { select: { voucherCode: true } },
      },
    }),
    prisma.pointTransaction.count({ where }),
  ]);

  const entries: AdminPointHistoryRow[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    method: row.method,
    note: row.note,
    createdAt: row.createdAt,
    cashierName: row.cashier?.name ?? null,
    outletName: row.outlet?.name ?? null,
    voucherCode: row.voucher?.voucherCode ?? null,
  }));

  return {
    entries,
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}

// Voucher milik pelanggan (riwayat penukaran). Dibuat read-only pada halaman
// detail; pembatalan/koreksi voucher dijalankan lewat halaman terpisah.
export async function getAdminCustomerVouchers(
  customerId: string,
): Promise<AdminCustomerVoucher[]> {
  return prisma.voucher.findMany({
    where: { userId: customerId },
    orderBy: { claimedAt: "desc" },
    take: DEFAULT_PAGE_SIZE,
    select: {
      id: true,
      voucherCode: true,
      rewardTitle: true,
      status: true,
      claimedAt: true,
      usedAt: true,
    },
  });
}
