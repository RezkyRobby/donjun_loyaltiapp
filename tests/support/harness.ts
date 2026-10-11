import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  OrderPaymentProofStatus,
  OrderStatus,
  PaymentAccountType,
  PaymentStatus,
  RewardBenefitType,
  UserRole,
  VoucherStatus,
  type PointTransactionMethod,
} from "@/generated/prisma/enums";
import { generateOrderCode } from "@/lib/order-code";
import { generateVoucherCode } from "@/lib/voucher-code";

// Harness uji integrasi transaksi atomik (PRD §9.1). Uji hanya dijalankan bila
// TEST_DATABASE_URL diisi; tanpa itu seluruh berkas di-skip agar `pnpm test`
// tidak butuh basis data. JANGAN arahkan DATABASE_URL produksi ke sini —
// harness menghapus isi tabel pada setiap reset.
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL?.trim());

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

// Menghapus seluruh baris dengan urutan yang menghormati foreign key.
export async function resetDatabase(): Promise<void> {
  await testPrisma.orderItemOption.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.orderPaymentProof.deleteMany();
  await testPrisma.orderPayment.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.pointTransaction.deleteMany();
  await testPrisma.auditLog.deleteMany();
  await testPrisma.voucher.deleteMany();
  await testPrisma.rewardCatalog.deleteMany();
  await testPrisma.menuOptionTag.deleteMany();
  await testPrisma.menuOptionGroup.deleteMany();
  await testPrisma.menu.deleteMany();
  await testPrisma.menuCategory.deleteMany();
  await testPrisma.paymentAccount.deleteMany();
  await testPrisma.session.deleteMany();
  await testPrisma.account.deleteMany();
  await testPrisma.verification.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.outlet.deleteMany();
}

export function createOutlet(name = `Outlet Uji ${randomUUID().slice(0, 8)}`) {
  return testPrisma.outlet.create({
    data: { name, address: "Jl. Pengujian No. 1" },
  });
}

export function createCashier(outletId: string) {
  return testPrisma.user.create({
    data: {
      email: `kasir-${randomUUID()}@uji.local`,
      name: "Kasir Uji",
      role: UserRole.CASHIER,
      emailVerified: true,
      outletId,
    },
  });
}

export function createCustomer(input: {
  username: string;
  pointsBalance?: number;
  isActive?: boolean;
}) {
  return testPrisma.user.create({
    data: {
      email: `pelanggan-${randomUUID()}@uji.local`,
      name: "Pelanggan Uji",
      username: input.username,
      role: UserRole.CUSTOMER,
      emailVerified: true,
      pointsBalance: input.pointsBalance ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

export function createMenu(input: {
  name: string;
  price: number;
  isActive?: boolean;
  categoryId?: string | null;
  optionGroups?: {
    name: string;
    sortOrder?: number;
    tags: { name: string; priceDelta?: number; sortOrder?: number }[];
  }[];
}) {
  return testPrisma.menu.create({
    data: {
      name: input.name,
      price: input.price,
      isActive: input.isActive ?? true,
      categoryId: input.categoryId ?? null,
      optionGroups: input.optionGroups
        ? {
            create: input.optionGroups.map((group) => ({
              name: group.name,
              sortOrder: group.sortOrder ?? 0,
              tags: {
                create: group.tags.map((tag) => ({
                  name: tag.name,
                  priceDelta: tag.priceDelta ?? 0,
                  sortOrder: tag.sortOrder ?? 0,
                })),
              },
            })),
          }
        : undefined,
    },
    include: { optionGroups: { include: { tags: true } } },
  });
}

export function createMenuCategory(input: {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return testPrisma.menuCategory.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

export function createPaymentAccount(input?: {
  type?: PaymentAccountType;
  providerName?: string;
  isActive?: boolean;
}) {
  return testPrisma.paymentAccount.create({
    data: {
      type: input?.type ?? PaymentAccountType.BANK_TRANSFER,
      providerName: input?.providerName ?? `BCA Uji ${randomUUID().slice(0, 6)}`,
      accountNumber: "1234567890",
      accountHolder: "Donjun Donat",
      isActive: input?.isActive ?? true,
    },
  });
}

// Pesanan uji lengkap dengan satu item & satu OrderPayment (PRD §7.6). Untuk
// uji konfirmasi/penolakan/kedaluwarsa tanpa perlu menjalankan `createOrder`.
export function createOrder(input: {
  customerId: string;
  outletId: string;
  menuId: string;
  status?: OrderStatus;
  voucherId?: string | null;
  paymentAccountId?: string | null;
  paymentDueAt?: Date;
  total?: number;
  orderCode?: string;
  paymentStatus?: PaymentStatus;
}) {
  const total = input.total ?? 10_000;

  return testPrisma.order.create({
    data: {
      orderCode: input.orderCode ?? generateOrderCode(),
      customerId: input.customerId,
      outletId: input.outletId,
      status: input.status ?? OrderStatus.AWAITING_PAYMENT,
      subtotal: total,
      discountAmount: 0,
      total,
      paymentDueAt: input.paymentDueAt ?? new Date(Date.now() + 24 * 60 * 60_000),
      voucherId: input.voucherId ?? null,
      items: {
        create: {
          menuId: input.menuId,
          menuName: "Menu Uji",
          unitPrice: total,
          quantity: 1,
          lineTotal: total,
        },
      },
      payments: {
        create: {
          amount: total,
          status: input.paymentStatus ?? PaymentStatus.PENDING,
          paymentAccountId: input.paymentAccountId ?? null,
        },
      },
    },
  });
}

export function createPaymentProof(input: {
  orderId: string;
  status?: OrderPaymentProofStatus;
  uploadedAt?: Date;
}) {
  return testPrisma.orderPaymentProof.create({
    data: {
      orderId: input.orderId,
      imageUrl: "https://res.cloudinary.com/uji/bukti.jpg",
      status: input.status ?? OrderPaymentProofStatus.PENDING,
      uploadedAt: input.uploadedAt ?? new Date(),
    },
  });
}

export function createReward(input: {
  pointsCost: number;
  quota?: number | null;
  perUserLimit?: number | null;
  isActive?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  title?: string;
  benefitType?: RewardBenefitType;
  linkedMenuId?: string | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
}) {
  return testPrisma.rewardCatalog.create({
    data: {
      title: input.title ?? `Promo Uji ${randomUUID().slice(0, 8)}`,
      pointsCost: input.pointsCost,
      quota: input.quota ?? null,
      perUserLimit: input.perUserLimit ?? null,
      isActive: input.isActive ?? true,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      benefitType: input.benefitType ?? RewardBenefitType.GENERIC,
      linkedMenuId: input.linkedMenuId ?? null,
      discountPercent: input.discountPercent ?? null,
      discountAmount: input.discountAmount ?? null,
    },
  });
}

export function createVoucher(input: {
  userId: string;
  rewardId: string;
  voucherCode?: string;
  rewardTitle?: string;
  pointsSpent?: number;
  status?: VoucherStatus;
  benefitType?: RewardBenefitType;
  discountPercent?: number | null;
  discountAmount?: number | null;
  linkedMenuId?: string | null;
  linkedMenuName?: string | null;
  linkedMenuPrice?: number | null;
}) {
  return testPrisma.voucher.create({
    data: {
      voucherCode: input.voucherCode ?? generateVoucherCode(),
      userId: input.userId,
      rewardId: input.rewardId,
      pointsSpent: input.pointsSpent ?? 5,
      rewardTitle: input.rewardTitle ?? "Promo Uji",
      status: input.status ?? VoucherStatus.ACTIVE,
      benefitType: input.benefitType ?? RewardBenefitType.GENERIC,
      discountPercent: input.discountPercent ?? null,
      discountAmount: input.discountAmount ?? null,
      linkedMenuId: input.linkedMenuId ?? null,
      linkedMenuName: input.linkedMenuName ?? null,
      linkedMenuPrice: input.linkedMenuPrice ?? null,
    },
  });
}

export function createEarnTransaction(input: {
  customerId: string;
  cashierId: string;
  outletId: string;
  idempotencyKey: string;
  createdAt: Date;
  method?: PointTransactionMethod;
}) {
  return testPrisma.pointTransaction.create({
    data: {
      customerId: input.customerId,
      cashierId: input.cashierId,
      outletId: input.outletId,
      type: "EARN",
      amount: 1,
      method: input.method ?? "USERNAME",
      idempotencyKey: input.idempotencyKey,
      createdAt: input.createdAt,
    },
  });
}
