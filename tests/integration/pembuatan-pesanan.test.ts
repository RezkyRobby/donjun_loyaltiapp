import { afterAll, describe, expect, it, vi } from "vitest";

import {
  PaymentMethod,
  PaymentStatus,
  RewardBenefitType,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { createOrderSchema, type CreateOrderInput } from "@/lib/shop";
import { createOrder } from "@/server/customer/orders";

import {
  createCustomer,
  createMenu,
  createOutlet,
  createPaymentAccount,
  createReward,
  createVoucher,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { setSession } from "../support/session";

// Pembuatan pesanan belanja diuji terhadap basis data uji (PRD §8.7; AGENTS.md
// aturan 3): harga dihitung ulang di server dari data menu terkini (harga klien
// diabaikan), baris `Voucher` dikunci (row lock) sehingga satu voucher tidak
// dapat ditempelkan ke dua pesanan aktif, dan voucher belum dikonsumsi saat
// checkout (tetap `ACTIVE`).
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));

// Server Action menerima keluaran skema (default & transformasi sudah diterapkan),
// sehingga input uji dibangun lewat skema yang sama agar bentuknya identik.
function orderInput(input: {
  outletId: string;
  paymentAccountId: string;
  voucherId?: string | null;
  note?: string | null;
  items: {
    menuId: string;
    quantity: number;
    note?: string | null;
    optionTagIds?: string[];
  }[];
}): CreateOrderInput {
  return createOrderSchema.parse(input);
}

describe.skipIf(!hasTestDatabase)("integrasi pembuatan pesanan belanja", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function prepareCustomer(pointsBalance = 10) {
    const outlet = await createOutlet();
    const paymentAccount = await createPaymentAccount();
    const customer = await createCustomer({
      username: `pelanggan.${Math.random().toString(36).slice(2, 10)}`,
      pointsBalance,
    });

    setSession({ id: customer.id, role: UserRole.CUSTOMER });

    return { outlet, paymentAccount, customer };
  }

  it("menghitung harga otoritatif dari data menu server termasuk priceDelta opsi", async () => {
    await resetDatabase();

    const { outlet, paymentAccount } = await prepareCustomer();
    const menu = await createMenu({
      name: "Donat Glaze",
      price: 10_000,
      optionGroups: [
        {
          name: "Topping",
          tags: [
            { name: "Coklat", priceDelta: 2_000 },
            { name: "Keju", priceDelta: 3_000 },
          ],
        },
      ],
    });
    const topping = menu.optionGroups[0]!.tags[0]!;

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        items: [
          {
            menuId: menu.id,
            quantity: 3,
            note: "Potong kecil",
            optionTagIds: [topping.id],
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { orderCode: result.orderCode },
      include: { items: { include: { options: true } }, payments: true },
    });

    // (10.000 + 2.000) × 3 = 36.000 — seluruhnya dari server.
    expect(order.subtotal).toBe(36_000);
    expect(order.discountAmount).toBe(0);
    expect(order.total).toBe(36_000);

    const item = order.items[0]!;
    expect(item).toMatchObject({
      menuId: menu.id,
      menuName: "Donat Glaze",
      unitPrice: 10_000,
      quantity: 3,
      note: "Potong kecil",
      isFree: false,
      lineTotal: 36_000,
    });
    expect(item.options).toHaveLength(1);
    expect(item.options[0]).toMatchObject({
      tagId: topping.id,
      name: "Coklat",
      priceDelta: 2_000,
    });

    expect(order.payments).toHaveLength(1);
    expect(order.payments[0]).toMatchObject({
      method: PaymentMethod.MANUAL_TRANSFER,
      status: PaymentStatus.PENDING,
      amount: 36_000,
      paymentAccountId: paymentAccount.id,
    });

    const windowMs = order.paymentDueAt.getTime() - order.createdAt.getTime();
    expect(Math.round(windowMs / 60_000)).toBe(1440);
  });

  it("menerapkan potongan voucher PERCENT_DISCOUNT pada total", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const menu = await createMenu({ name: "Kopi Susu", price: 15_000 });
    const reward = await createReward({
      pointsCost: 1,
      benefitType: RewardBenefitType.PERCENT_DISCOUNT,
      discountPercent: 10,
    });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
      benefitType: RewardBenefitType.PERCENT_DISCOUNT,
      discountPercent: 10,
    });

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: menu.id, quantity: 2 }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { orderCode: result.orderCode },
    });
    expect(order.subtotal).toBe(30_000);
    expect(order.discountAmount).toBe(3_000);
    expect(order.total).toBe(27_000);
    expect(order.voucherId).toBe(voucher.id);
  });

  it("menambahkan baris gratis untuk voucher PRODUCT", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const paid = await createMenu({ name: "Kopi Susu", price: 15_000 });
    const free = await createMenu({ name: "Donat Glaze", price: 8_000 });
    const reward = await createReward({
      pointsCost: 1,
      benefitType: RewardBenefitType.PRODUCT,
      linkedMenuId: free.id,
    });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
      benefitType: RewardBenefitType.PRODUCT,
      linkedMenuId: free.id,
      linkedMenuName: "Donat Glaze",
      linkedMenuPrice: 8_000,
    });

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: paid.id, quantity: 1 }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { orderCode: result.orderCode },
      include: { items: true },
    });
    expect(order.items).toHaveLength(2);
    const freeLine = order.items.find((item) => item.isFree);
    expect(freeLine).toMatchObject({
      menuId: free.id,
      menuName: "Donat Glaze",
      unitPrice: 8_000,
      quantity: 1,
      lineTotal: 0,
    });
    expect(order.total).toBe(15_000);
  });

  it("menolak menu yang sudah tidak aktif", async () => {
    await resetDatabase();

    const { outlet, paymentAccount } = await prepareCustomer();
    const menu = await createMenu({
      name: "Menu Lama",
      price: 10_000,
      isActive: false,
    });

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("tidak tersedia");
    }
    expect(await testPrisma.order.count()).toBe(0);
  });

  it("menolak opsi tag yang bukan milik menu", async () => {
    await resetDatabase();

    const { outlet, paymentAccount } = await prepareCustomer();
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    const other = await createMenu({
      name: "Lain",
      price: 5_000,
      optionGroups: [{ name: "Rasa", tags: [{ name: "Coklat", priceDelta: 1_000 }] }],
    });
    const foreignTag = other.optionGroups[0]!.tags[0]!;

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        items: [{ menuId: menu.id, quantity: 1, optionTagIds: [foreignTag.id] }],
      }),
    );

    expect(result.ok).toBe(false);
    expect(await testPrisma.order.count()).toBe(0);
  });

  it("tidak mengonsumsi voucher saat checkout (tetap ACTIVE)", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    const reward = await createReward({ pointsCost: 1 });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
    });

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );
    expect(result.ok).toBe(true);

    const stored = await testPrisma.voucher.findUniqueOrThrow({
      where: { id: voucher.id },
      select: { status: true, usedAt: true },
    });
    expect(stored.status).toBe(VoucherStatus.ACTIVE);
    expect(stored.usedAt).toBeNull();
  });

  it("menolak voucher yang sudah terpakai pesanan aktif lain", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    const reward = await createReward({ pointsCost: 1 });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
    });

    const first = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );
    expect(first.ok).toBe(true);

    const second = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.message).toContain("pesanan aktif lain");
    }
    expect(await testPrisma.order.count()).toBe(1);
  });

  it("dua pesanan bersamaan dengan voucher sama: hanya satu berhasil", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    const reward = await createReward({ pointsCost: 1 });
    const voucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
    });

    const buildInput = () =>
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: voucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      });

    const results = await Promise.all([
      createOrder(buildInput()),
      createOrder(buildInput()),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      await testPrisma.order.count({ where: { voucherId: voucher.id } }),
    ).toBe(1);
  });

  it("menolak voucher yang tidak aktif atau bukan milik pelanggan", async () => {
    await resetDatabase();

    const { outlet, paymentAccount, customer } = await prepareCustomer();
    const other = await createCustomer({
      username: "pelanggan.lain",
      pointsBalance: 0,
    });
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    const reward = await createReward({ pointsCost: 1 });
    const usedVoucher = await createVoucher({
      userId: customer.id,
      rewardId: reward.id,
      status: VoucherStatus.USED,
    });
    const otherVoucher = await createVoucher({
      userId: other.id,
      rewardId: reward.id,
    });

    const usedResult = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: usedVoucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );
    expect(usedResult.ok).toBe(false);

    const foreignResult = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        voucherId: otherVoucher.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );
    expect(foreignResult.ok).toBe(false);

    expect(await testPrisma.order.count()).toBe(0);
  });

  it("menolak pesanan saat akun pelanggan ditangguhkan", async () => {
    await resetDatabase();

    const outlet = await createOutlet();
    const paymentAccount = await createPaymentAccount();
    const customer = await createCustomer({
      username: "pelanggan.suspend",
      pointsBalance: 0,
      isActive: false,
    });
    const menu = await createMenu({ name: "Donat", price: 8_000 });
    setSession({ id: customer.id, role: UserRole.CUSTOMER });

    const result = await createOrder(
      orderInput({
        outletId: outlet.id,
        paymentAccountId: paymentAccount.id,
        items: [{ menuId: menu.id, quantity: 1 }],
      }),
    );

    expect(result.ok).toBe(false);
    expect(await testPrisma.order.count()).toBe(0);
  });
});
