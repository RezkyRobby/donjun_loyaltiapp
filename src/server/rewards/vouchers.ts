import type { VoucherStatus } from "@/generated/prisma/enums";
import { DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

// Dompet voucher pelanggan (PRD §5.1 fitur 6). Daftar terpaginasi server-side
// (NFR §9) dan mencakup seluruh status: ACTIVE, USED, CANCELED.
export type CustomerVoucher = {
  id: string;
  voucherCode: string;
  rewardTitle: string;
  status: VoucherStatus;
  claimedAt: Date;
  usedAt: Date | null;
  canceledAt: Date | null;
};

export type CustomerVoucherPage = {
  vouchers: CustomerVoucher[];
  page: number;
  totalPages: number;
  total: number;
};

const VOUCHER_SELECT = {
  id: true,
  voucherCode: true,
  rewardTitle: true,
  status: true,
  claimedAt: true,
  usedAt: true,
  canceledAt: true,
} as const;

export async function getCustomerVouchers(
  userId: string,
  page = 1,
): Promise<CustomerVoucherPage> {
  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where: { userId },
      orderBy: { claimedAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: VOUCHER_SELECT,
    }),
    prisma.voucher.count({ where: { userId } }),
  ]);

  return {
    vouchers,
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}
