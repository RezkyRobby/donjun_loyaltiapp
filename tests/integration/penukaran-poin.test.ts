import { afterAll, describe, expect, it, vi } from "vitest";

import {
  PointTransactionType,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { redeemReward } from "@/server/rewards/redeem";

import {
  createCustomer,
  createReward,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { queueSessions, setSession } from "../support/session";

// Penukaran poin diuji terhadap basis data uji: pemotongan saldo kondisional
// menjamin saldo tidak pernah negatif, dan kuota promo dijaga di dalam
// transaksi Serializable (PRD §8.4; AGENTS.md aturan 3).
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));

describe.skipIf(!hasTestDatabase)("integrasi penukaran poin", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("dua penukaran bersamaan tidak membuat saldo negatif", async () => {
    await resetDatabase();

    const customer = await createCustomer({
      username: "pelanggan.saldo",
      pointsBalance: 5,
    });
    const reward = await createReward({
      pointsCost: 5,
      quota: null,
      perUserLimit: null,
    });
    setSession({ id: customer.id, role: UserRole.CUSTOMER });

    const results = await Promise.all([
      redeemReward({ rewardId: reward.id }),
      redeemReward({ rewardId: reward.id }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { pointsBalance: true },
    });
    expect(updated.pointsBalance).toBe(0);
    expect(updated.pointsBalance).toBeGreaterThanOrEqual(0);

    expect(
      await testPrisma.voucher.count({ where: { userId: customer.id } }),
    ).toBe(1);
    expect(
      await testPrisma.pointTransaction.count({
        where: { customerId: customer.id, type: PointTransactionType.REDEEM },
      }),
    ).toBe(1);
  });

  it("kuota promo tidak terlampaui saat dua pelanggan menukar bersamaan", async () => {
    await resetDatabase();

    const reward = await createReward({
      pointsCost: 1,
      quota: 1,
      perUserLimit: null,
    });
    const first = await createCustomer({
      username: "pelanggan.kuota.a",
      pointsBalance: 1,
    });
    const second = await createCustomer({
      username: "pelanggan.kuota.b",
      pointsBalance: 1,
    });
    queueSessions([
      { id: first.id, role: UserRole.CUSTOMER },
      { id: second.id, role: UserRole.CUSTOMER },
    ]);

    const results = await Promise.all([
      redeemReward({ rewardId: reward.id }),
      redeemReward({ rewardId: reward.id }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      await testPrisma.voucher.count({
        where: { rewardId: reward.id, status: VoucherStatus.ACTIVE },
      }),
    ).toBe(1);
  });

  it("menolak penukaran saat saldo tidak mencukupi tanpa mengubah saldo", async () => {
    await resetDatabase();

    const customer = await createCustomer({
      username: "pelanggan.miskin",
      pointsBalance: 2,
    });
    const reward = await createReward({
      pointsCost: 5,
      quota: null,
      perUserLimit: null,
    });
    setSession({ id: customer.id, role: UserRole.CUSTOMER });

    const result = await redeemReward({ rewardId: reward.id });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("tidak mencukupi");
    }

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { pointsBalance: true },
    });
    expect(updated.pointsBalance).toBe(2);
    expect(
      await testPrisma.voucher.count({ where: { userId: customer.id } }),
    ).toBe(0);
  });
});
