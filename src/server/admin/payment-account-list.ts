import type { PaymentAccountType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Kueri daftar & detail rekening tujuan transfer manual untuk backoffice
// (PRD §5.3 fitur 9). Rekening bersifat global dan ditampilkan kepada pelanggan
// saat checkout. Jumlah pembayaran yang memakai rekening ditampilkan sebagai
// konteks; rekening yang sudah dipakai tidak dihapus permanen — dinonaktifkan.

export type AdminPaymentAccount = {
  id: string;
  type: PaymentAccountType;
  providerName: string;
  accountNumber: string | null;
  accountHolder: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  paymentCount: number;
};

const PAYMENT_ACCOUNT_SELECT = {
  id: true,
  type: true,
  providerName: true,
  accountNumber: true,
  accountHolder: true,
  imageUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  _count: { select: { payments: true } },
} satisfies Prisma.PaymentAccountSelect;

type PaymentAccountRow = Prisma.PaymentAccountGetPayload<{
  select: typeof PAYMENT_ACCOUNT_SELECT;
}>;

function toAdminPaymentAccount(
  row: PaymentAccountRow,
): AdminPaymentAccount {
  return {
    id: row.id,
    type: row.type,
    providerName: row.providerName,
    accountNumber: row.accountNumber,
    accountHolder: row.accountHolder,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    paymentCount: row._count.payments,
  };
}

export async function getAdminPaymentAccounts(): Promise<
  AdminPaymentAccount[]
> {
  const rows = await prisma.paymentAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { providerName: "asc" }],
    select: PAYMENT_ACCOUNT_SELECT,
  });

  return rows.map(toAdminPaymentAccount);
}

export async function getAdminPaymentAccountById(
  id: string,
): Promise<AdminPaymentAccount | null> {
  const row = await prisma.paymentAccount.findUnique({
    where: { id },
    select: PAYMENT_ACCOUNT_SELECT,
  });

  return row ? toAdminPaymentAccount(row) : null;
}
