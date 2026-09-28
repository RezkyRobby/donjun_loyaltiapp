import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole, VoucherStatus } from "@/generated/prisma/enums";
import { validateVoucher } from "@/server/kasir/validate-voucher";

import {
  createCashier,
  createCustomer,
  createOutlet,
  createReward,
  createVoucher,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { setSession } from "../support/session";

// Voucher single-use harus hanya dapat dipakai sekali meski dua permintaan
// validasi datang bersamaan (PRD §5.2 fitur 5, §14; AGENTS.md aturan 3).
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));

const VOUCHER_CODE = "DJN-23456789ABCDEFGH";

describe.skipIf(!hasTestDatabase)("integrasi validasi voucher", () => {
  let cashierId: string;
  let voucherId: string;

  beforeEach(async () => {
    await resetDatabase();

    const outlet = await createOutlet();
    const cashier = await createCashier(outlet.id);
    cashierId = cashier.id;

    const customer = await createCustomer({ username: "pelanggan.voucher" });
    const reward = await createReward({ pointsCost: 5 });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
      voucherCode: VOUCHER_CODE,
    });
    voucherId = voucher.id;

    setSession({ id: cashierId, role: UserRole.CASHIER });
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("hanya satu dari dua validasi bersamaan yang berhasil", async () => {
    const results = await Promise.all([
      validateVoucher(VOUCHER_CODE),
      validateVoucher(VOUCHER_CODE),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const rejected = results.find((result) => !result.ok);
    expect(rejected?.ok).toBe(false);
    if (rejected && !rejected.ok) {
      expect(rejected.code).toBe("USED");
    }

    const voucher = await testPrisma.voucher.findUniqueOrThrow({
      where: { id: voucherId },
    });
    expect(voucher.status).toBe(VoucherStatus.USED);
    expect(voucher.usedByCashierId).toBe(cashierId);
    expect(voucher.usedAt).not.toBeNull();
    expect(voucher.usedAtOutletId).not.toBeNull();
  });

  it("validasi ulang voucher terpakai tidak mengubah waktu pakai", async () => {
    const first = await validateVoucher(VOUCHER_CODE);
    expect(first.ok).toBe(true);

    const before = await testPrisma.voucher.findUniqueOrThrow({
      where: { id: voucherId },
      select: { usedAt: true },
    });

    const second = await validateVoucher(VOUCHER_CODE);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("USED");
    }

    const after = await testPrisma.voucher.findUniqueOrThrow({
      where: { id: voucherId },
      select: { usedAt: true },
    });
    expect(after.usedAt?.getTime()).toBe(before.usedAt?.getTime());
  });
});
