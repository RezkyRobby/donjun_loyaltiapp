import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Kueri daftar outlet untuk backoffice (PRD §5.3 fitur 6). Jumlah staf, voucher
// yang tervalidasi di outlet, dan transaksi poin ditampilkan sebagai konteks;
// ketiganya menentukan boleh-tidaknya outlet dihapus permanen. Poin dan voucher
// pelanggan tetap global lintas outlet (AGENTS.md).

export type AdminOutlet = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  staffCount: number;
  voucherCount: number;
  transactionCount: number;
  canDelete: boolean;
};

export type AdminOutletDetail = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
};

const OUTLET_SELECT = {
  id: true,
  name: true,
  address: true,
  phone: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: {
      users: true,
      vouchersUsed: true,
      pointTransactions: true,
    },
  },
} satisfies Prisma.OutletSelect;

type OutletRow = Prisma.OutletGetPayload<{ select: typeof OUTLET_SELECT }>;

function toAdminOutlet(row: OutletRow): AdminOutlet {
  const staffCount = row._count.users;
  const voucherCount = row._count.vouchersUsed;
  const transactionCount = row._count.pointTransactions;

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt,
    staffCount,
    voucherCount,
    transactionCount,
    canDelete: staffCount === 0 && voucherCount === 0 && transactionCount === 0,
  };
}

export async function getAdminOutlets(): Promise<AdminOutlet[]> {
  const rows = await prisma.outlet.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: OUTLET_SELECT,
  });

  return rows.map(toAdminOutlet);
}

const OUTLET_DETAIL_SELECT = {
  id: true,
  name: true,
  address: true,
  phone: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.OutletSelect;

export async function getAdminOutletById(
  id: string,
): Promise<AdminOutletDetail | null> {
  return prisma.outlet.findUnique({
    where: { id },
    select: OUTLET_DETAIL_SELECT,
  });
}

// Menghitung referensi outlet pada data operasional. Dipakai Server Action
// penghapusan: outlet yang telah dipakai kasir atau transaksi tidak boleh
// dihapus permanen agar riwayat tetap utuh — cukup dinonaktifkan.
export async function countOutletReferences(
  id: string,
): Promise<{ staff: number; vouchers: number; transactions: number }> {
  const [staff, vouchers, transactions] = await Promise.all([
    prisma.user.count({ where: { outletId: id } }),
    prisma.voucher.count({ where: { usedAtOutletId: id } }),
    prisma.pointTransaction.count({ where: { outletId: id } }),
  ]);

  return { staff, vouchers, transactions };
}
