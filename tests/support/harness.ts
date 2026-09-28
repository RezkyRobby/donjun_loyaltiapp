import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  UserRole,
  VoucherStatus,
  type PointTransactionMethod,
} from "@/generated/prisma/enums";

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
  await testPrisma.pointTransaction.deleteMany();
  await testPrisma.auditLog.deleteMany();
  await testPrisma.voucher.deleteMany();
  await testPrisma.rewardCatalog.deleteMany();
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

export function createReward(input: {
  pointsCost: number;
  quota?: number | null;
  perUserLimit?: number | null;
  isActive?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  title?: string;
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
    },
  });
}

export function createVoucher(input: {
  userId: string;
  rewardId: string;
  voucherCode: string;
  rewardTitle?: string;
  pointsSpent?: number;
  status?: VoucherStatus;
}) {
  return testPrisma.voucher.create({
    data: {
      voucherCode: input.voucherCode,
      userId: input.userId,
      rewardId: input.rewardId,
      pointsSpent: input.pointsSpent ?? 5,
      rewardTitle: input.rewardTitle ?? "Promo Uji",
      status: input.status ?? VoucherStatus.ACTIVE,
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
