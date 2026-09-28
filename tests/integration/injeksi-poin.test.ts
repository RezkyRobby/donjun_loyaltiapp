import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PointTransactionType, UserRole } from "@/generated/prisma/enums";
import { injectPoints } from "@/server/kasir/inject-points";

import {
  createCashier,
  createCustomer,
  createEarnTransaction,
  createOutlet,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { setSession } from "../support/session";

// Server Action diuji langsung terhadap basis data uji dengan sesi kasir yang
// dimock, sehingga jalur transaksi atomik, idempotency key, dan cooldown
// benar-benar dieksekusi (PRD §8.3, §9; AGENTS.md aturan 3 & 4).
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));

const CUSTOMER_USERNAME = "pelanggan.injeksi";

describe.skipIf(!hasTestDatabase)("integrasi injeksi poin", () => {
  let outletId: string;
  let cashierId: string;
  let customerId: string;

  beforeEach(async () => {
    await resetDatabase();

    const outlet = await createOutlet();
    outletId = outlet.id;

    const cashier = await createCashier(outletId);
    cashierId = cashier.id;

    const customer = await createCustomer({ username: CUSTOMER_USERNAME });
    customerId = customer.id;

    setSession({ id: cashierId, role: UserRole.CASHIER });
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  function inject(idempotencyKey: string) {
    return injectPoints({
      username: CUSTOMER_USERNAME,
      idempotencyKey,
      method: "USERNAME",
    });
  }

  async function currentBalance(): Promise<number> {
    const customer = await testPrisma.user.findUniqueOrThrow({
      where: { id: customerId },
      select: { pointsBalance: true },
    });

    return customer.pointsBalance;
  }

  it("retry dengan idempotency key sama hanya menambah satu poin", async () => {
    const key = randomUUID();

    const first = await inject(key);
    const retry = await inject(key);

    expect(first).toEqual({ ok: true, pointsBalance: 1 });
    expect(retry).toEqual({ ok: true, pointsBalance: 1 });
    expect(await currentBalance()).toBe(1);
    expect(
      await testPrisma.pointTransaction.count({
        where: { idempotencyKey: key },
      }),
    ).toBe(1);
  });

  it("dua permintaan bersamaan dengan key sama tetap satu poin", async () => {
    const key = randomUUID();

    const results = await Promise.all([inject(key), inject(key)]);

    expect(results.every((result) => result.ok)).toBe(true);
    expect(await currentBalance()).toBe(1);
    expect(
      await testPrisma.pointTransaction.count({
        where: { customerId, type: PointTransactionType.EARN },
      }),
    ).toBe(1);
  });

  it("menolak injeksi kedua selama cooldown berjalan", async () => {
    expect((await inject(randomUUID())).ok).toBe(true);

    const second = await inject(randomUUID());

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("COOLDOWN");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    }
    expect(await currentBalance()).toBe(1);
  });

  it("dua permintaan bersamaan dengan key berbeda: hanya satu lolos cooldown", async () => {
    const results = await Promise.all([inject(randomUUID()), inject(randomUUID())]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const rejected = results.find((result) => !result.ok);
    expect(rejected?.ok).toBe(false);
    if (rejected && !rejected.ok) {
      expect(rejected.code).toBe("COOLDOWN");
    }
    expect(await currentBalance()).toBe(1);
  });

  it("mengizinkan injeksi setelah cooldown berlalu", async () => {
    await createEarnTransaction({
      customerId,
      cashierId,
      outletId,
      idempotencyKey: randomUUID(),
      createdAt: new Date(Date.now() - 61_000),
    });
    await testPrisma.user.update({
      where: { id: customerId },
      data: { pointsBalance: 1 },
    });

    const result = await inject(randomUUID());

    expect(result).toEqual({ ok: true, pointsBalance: 2 });
  });
});
