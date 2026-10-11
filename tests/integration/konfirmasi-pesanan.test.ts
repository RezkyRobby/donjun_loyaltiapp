import { afterAll, describe, expect, it, vi } from "vitest";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY,
} from "@/constants/audit";
import {
  OrderPaymentProofStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import { cancelOrder } from "@/server/customer/orders";
import {
  completeOrder,
  confirmOrder,
  rejectOrder,
} from "@/server/kasir/orders";

import {
  createCashier,
  createCustomer,
  createMenu,
  createOrder,
  createOutlet,
  createPaymentAccount,
  createPaymentProof,
  createReward,
  createVoucher,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { setSession } from "../support/session";

// Aksi kasir atas pesanan belanja (PRD §8.8; AGENTS.md aturan 3). Konfirmasi
// mengonsumsi voucher sekali pakai secara atomik dan kondisional; pembaruan
// status bersifat kondisional sehingga dua kasir tidak dapat memproses pesanan
// yang sama dua kali. Penolakan/pembatalan tidak mengonsumsi voucher.
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));
// `revalidatePath` memerlukan request store Next.js; di uji integrasi ini
// (dijalankan di luar HTTP) cukup dimock karena efek cache tidak diuji di sini.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe.skipIf(!hasTestDatabase)("integrasi aksi kasir atas pesanan", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function prepareOrder(input: {
    status: OrderStatus;
    voucherStatus?: VoucherStatus;
    withVoucher?: boolean;
    withProof?: boolean;
  }) {
    const outlet = await createOutlet();
    const cashier = await createCashier(outlet.id);
    const customer = await createCustomer({
      username: `pelanggan.${Math.random().toString(36).slice(2, 10)}`,
      pointsBalance: 0,
    });
    const menu = await createMenu({ name: "Donat", price: 10_000 });
    const paymentAccount = await createPaymentAccount();
    const reward = await createReward({ pointsCost: 1 });

    const voucher =
      input.withVoucher === false
        ? null
        : await createVoucher({
            userId: customer.id,
            rewardId: reward.id,
            status: input.voucherStatus ?? VoucherStatus.ACTIVE,
          });

    const order = await createOrder({
      customerId: customer.id,
      outletId: outlet.id,
      menuId: menu.id,
      status: input.status,
      voucherId: voucher?.id ?? null,
      paymentAccountId: paymentAccount.id,
    });

    const proof = input.withProof
      ? await createPaymentProof({ orderId: order.id })
      : null;

    return { outlet, cashier, customer, menu, voucher, order, proof };
  }

  it("konfirmasi mengonsumsi voucher sekali pakai dan menandai pembayaran PAID", async () => {
    await resetDatabase();

    const { outlet, cashier, order, voucher } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      withProof: true,
    });
    setSession({ id: cashier.id, role: UserRole.CASHIER });

    const result = await confirmOrder({ orderId: order.id });
    expect(result.ok).toBe(true);

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: {
        status: true,
        confirmedByCashierId: true,
        confirmedAt: true,
      },
    });
    expect(updated.status).toBe(OrderStatus.IN_PROGRESS);
    expect(updated.confirmedByCashierId).toBe(cashier.id);
    expect(updated.confirmedAt).not.toBeNull();

    const storedVoucher = await testPrisma.voucher.findUniqueOrThrow({
      where: { id: voucher!.id },
    });
    expect(storedVoucher.status).toBe(VoucherStatus.USED);
    expect(storedVoucher.usedByCashierId).toBe(cashier.id);
    expect(storedVoucher.usedAtOutletId).toBe(outlet.id);
    expect(storedVoucher.usedAt).not.toBeNull();

    const proof = await testPrisma.orderPaymentProof.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(proof.status).toBe(OrderPaymentProofStatus.ACCEPTED);
    expect(proof.reviewedByCashierId).toBe(cashier.id);

    const payment = await testPrisma.orderPayment.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.paidAt).not.toBeNull();

    const audit = await testPrisma.auditLog.findFirstOrThrow({
      where: { entityId: order.id, action: AUDIT_ACTION.ORDER_CONFIRMED },
    });
    expect(audit.entity).toBe(AUDIT_ENTITY.ORDER);
  });

  it("dua kasir mengonfirmasi bersamaan: hanya satu berhasil", async () => {
    await resetDatabase();

    const { cashier, order, voucher } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      withProof: true,
    });
    setSession({ id: cashier.id, role: UserRole.CASHIER });

    const results = await Promise.all([
      confirmOrder({ orderId: order.id }),
      confirmOrder({ orderId: order.id }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });
    expect(updated.status).toBe(OrderStatus.IN_PROGRESS);
    expect(
      await testPrisma.auditLog.count({
        where: { entityId: order.id, action: AUDIT_ACTION.ORDER_CONFIRMED },
      }),
    ).toBe(1);
    expect(
      (await testPrisma.voucher.findUniqueOrThrow({ where: { id: voucher!.id } }))
        .status,
    ).toBe(VoucherStatus.USED);
  });

  it("konfirmasi dibatalkan (rollback) bila voucher sudah tidak ACTIVE", async () => {
    await resetDatabase();

    const { cashier, order, voucher } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      voucherStatus: VoucherStatus.USED,
      withProof: true,
    });
    setSession({ id: cashier.id, role: UserRole.CASHIER });

    const result = await confirmOrder({ orderId: order.id });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("tidak aktif");
    }

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, confirmedAt: true },
    });
    expect(updated.status).toBe(OrderStatus.AWAITING_CONFIRMATION);
    expect(updated.confirmedAt).toBeNull();

    const payment = await testPrisma.orderPayment.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe(PaymentStatus.PENDING);

    expect(
      (await testPrisma.voucher.findUniqueOrThrow({ where: { id: voucher!.id } }))
        .status,
    ).toBe(VoucherStatus.USED);
  });

  it("penolakan tidak mengonsumsi voucher dan menandai pembayaran FAILED", async () => {
    await resetDatabase();

    const { cashier, order, voucher } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      withProof: true,
    });
    setSession({ id: cashier.id, role: UserRole.CASHIER });

    const result = await rejectOrder({
      orderId: order.id,
      rejectionReason: "Bukti buram",
    });
    expect(result.ok).toBe(true);

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, rejectionReason: true },
    });
    expect(updated.status).toBe(OrderStatus.REJECTED);
    expect(updated.rejectionReason).toBe("Bukti buram");

    expect(
      (await testPrisma.voucher.findUniqueOrThrow({ where: { id: voucher!.id } }))
        .status,
    ).toBe(VoucherStatus.ACTIVE);

    const proof = await testPrisma.orderPaymentProof.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(proof.status).toBe(OrderPaymentProofStatus.REJECTED);

    const payment = await testPrisma.orderPayment.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe(PaymentStatus.FAILED);

    expect(
      await testPrisma.auditLog.count({
        where: { entityId: order.id, action: AUDIT_ACTION.ORDER_REJECTED },
      }),
    ).toBe(1);
  });

  it("pembatalan oleh pelanggan tidak mengonsumsi voucher", async () => {
    await resetDatabase();

    const { customer, order, voucher } = await prepareOrder({
      status: OrderStatus.AWAITING_PAYMENT,
    });
    setSession({ id: customer.id, role: UserRole.CUSTOMER });

    const result = await cancelOrder({ orderCode: order.orderCode });
    expect(result.ok).toBe(true);

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });
    expect(updated.status).toBe(OrderStatus.CANCELED);
    expect(
      (await testPrisma.voucher.findUniqueOrThrow({ where: { id: voucher!.id } }))
        .status,
    ).toBe(VoucherStatus.ACTIVE);
    expect(
      await testPrisma.auditLog.count({
        where: { entityId: order.id, action: AUDIT_ACTION.ORDER_CANCELED },
      }),
    ).toBe(1);

    // Pembatalan kedua ditolak karena status sudah bukan AWAITING_PAYMENT.
    const again = await cancelOrder({ orderCode: order.orderCode });
    expect(again.ok).toBe(false);
  });

  it("kasir dari outlet lain tidak dapat menindak pesanan", async () => {
    await resetDatabase();

    const { order } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      withProof: true,
    });
    const otherOutlet = await createOutlet();
    const otherCashier = await createCashier(otherOutlet.id);
    setSession({ id: otherCashier.id, role: UserRole.CASHIER });

    const result = await confirmOrder({ orderId: order.id });

    expect(result.ok).toBe(false);
    expect(
      (
        await testPrisma.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { status: true },
        })
      ).status,
    ).toBe(OrderStatus.AWAITING_CONFIRMATION);
  });

  it("penyelesaian hanya berlaku dari status IN_PROGRESS", async () => {
    await resetDatabase();

    const { cashier, order } = await prepareOrder({
      status: OrderStatus.AWAITING_CONFIRMATION,
      withProof: true,
    });
    setSession({ id: cashier.id, role: UserRole.CASHIER });

    const tooEarly = await completeOrder({ orderId: order.id });
    expect(tooEarly.ok).toBe(false);

    await testPrisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.IN_PROGRESS },
    });

    const done = await completeOrder({ orderId: order.id });
    expect(done.ok).toBe(true);
    expect(
      (
        await testPrisma.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { status: true, completedAt: true },
        })
      ).status,
    ).toBe(OrderStatus.COMPLETED);
    expect(
      await testPrisma.auditLog.count({
        where: { entityId: order.id, action: AUDIT_ACTION.ORDER_COMPLETED },
      }),
    ).toBe(1);
  });
});
