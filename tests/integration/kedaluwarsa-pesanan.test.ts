import { afterAll, describe, expect, it } from "vitest";

import { AUDIT_ACTION } from "@/constants/audit";
import { OrderStatus, VoucherStatus } from "@/generated/prisma/enums";
import { getCustomerOrderByCode } from "@/server/customer/order-list";
import {
  expireDueOrdersForCustomer,
  expireOrderIfDue,
} from "@/server/orders/expiry";

import {
  createCustomer,
  createMenu,
  createOrder,
  createOutlet,
  createReward,
  createVoucher,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";

// Penegakan kedaluwarsa pesanan secara *lazy* (PRD §5.4 fitur 5, §8.7; NFR §9).
// Hanya pesanan `AWAITING_PAYMENT` yang lewat tenggat yang ditandai `EXPIRED`;
// voucher yang ditempel tidak dikonsumsi (tetap `ACTIVE`) dan aksi sistem
// tercatat pada AuditLog tanpa aktor.
describe.skipIf(!hasTestDatabase)("integrasi kedaluwarsa pesanan", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function prepareOrder(input: {
    status?: OrderStatus;
    dueAt: Date;
    withVoucher?: boolean;
  }) {
    const outlet = await createOutlet();
    const customer = await createCustomer({
      username: `pelanggan.${Math.random().toString(36).slice(2, 10)}`,
      pointsBalance: 0,
    });
    const menu = await createMenu({ name: "Donat", price: 10_000 });

    let voucherId: string | null = null;
    if (input.withVoucher) {
      const reward = await createReward({ pointsCost: 1 });
      const voucher = await createVoucher({
        userId: customer.id,
        rewardId: reward.id,
      });
      voucherId = voucher.id;
    }

    const order = await createOrder({
      customerId: customer.id,
      outletId: outlet.id,
      menuId: menu.id,
      status: input.status ?? OrderStatus.AWAITING_PAYMENT,
      paymentDueAt: input.dueAt,
      voucherId,
    });

    return { customer, order, voucherId };
  }

  it("menandai EXPIRED pesanan yang lewat tenggat dan melepaskan voucher", async () => {
    await resetDatabase();

    const now = new Date();
    const { order, voucherId } = await prepareOrder({
      dueAt: new Date(now.getTime() - 60_000),
      withVoucher: true,
    });

    const status = await expireOrderIfDue(order.id, now);
    expect(status).toBe(OrderStatus.EXPIRED);

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, expiredAt: true },
    });
    expect(updated.status).toBe(OrderStatus.EXPIRED);
    expect(updated.expiredAt).not.toBeNull();

    // Voucher tidak dikonsumsi.
    expect(
      (
        await testPrisma.voucher.findUniqueOrThrow({
          where: { id: voucherId! },
          select: { status: true },
        })
      ).status,
    ).toBe(VoucherStatus.ACTIVE);

    const audit = await testPrisma.auditLog.findFirstOrThrow({
      where: { entityId: order.id, action: AUDIT_ACTION.ORDER_EXPIRED },
    });
    expect(audit.actorId).toBeNull();
  });

  it("tidak mengubah status pesanan lanjutan", async () => {
    await resetDatabase();

    const now = new Date();
    const dueAt = new Date(now.getTime() - 60_000);
    const statuses = [
      OrderStatus.AWAITING_CONFIRMATION,
      OrderStatus.IN_PROGRESS,
      OrderStatus.COMPLETED,
      OrderStatus.REJECTED,
      OrderStatus.CANCELED,
      OrderStatus.EXPIRED,
    ];

    for (const status of statuses) {
      const { order } = await prepareOrder({ status, dueAt });
      const result = await expireOrderIfDue(order.id, now);

      expect(result).toBe(status);
      expect(
        (
          await testPrisma.order.findUniqueOrThrow({
            where: { id: order.id },
            select: { status: true },
          })
        ).status,
      ).toBe(status);
    }

    expect(await testPrisma.auditLog.count()).toBe(0);
  });

  it("tidak menandai pesanan yang tenggatnya belum lewat", async () => {
    await resetDatabase();

    const now = new Date();
    const { order } = await prepareOrder({
      dueAt: new Date(now.getTime() + 60 * 60_000),
    });

    const status = await expireOrderIfDue(order.id, now);

    expect(status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(
      (
        await testPrisma.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { expiredAt: true },
        })
      ).expiredAt,
    ).toBeNull();
  });

  it("expireDueOrdersForCustomer menandai hanya pesanan due milik pelanggan", async () => {
    await resetDatabase();

    const now = new Date();
    const outlet = await createOutlet();
    const menu = await createMenu({ name: "Donat", price: 10_000 });

    const customer = await createCustomer({
      username: "pelanggan.due",
      pointsBalance: 0,
    });
    const other = await createCustomer({
      username: "pelanggan.other",
      pointsBalance: 0,
    });

    const due1 = await createOrder({
      customerId: customer.id,
      outletId: outlet.id,
      menuId: menu.id,
      paymentDueAt: new Date(now.getTime() - 120_000),
    });
    const due2 = await createOrder({
      customerId: customer.id,
      outletId: outlet.id,
      menuId: menu.id,
      paymentDueAt: new Date(now.getTime() - 60_000),
    });
    const future = await createOrder({
      customerId: customer.id,
      outletId: outlet.id,
      menuId: menu.id,
      paymentDueAt: new Date(now.getTime() + 60 * 60_000),
    });
    const otherDue = await createOrder({
      customerId: other.id,
      outletId: outlet.id,
      menuId: menu.id,
      paymentDueAt: new Date(now.getTime() - 60_000),
    });

    await expireDueOrdersForCustomer(customer.id, now);

    const statusOf = async (id: string) =>
      (
        await testPrisma.order.findUniqueOrThrow({
          where: { id },
          select: { status: true },
        })
      ).status;

    expect(await statusOf(due1.id)).toBe(OrderStatus.EXPIRED);
    expect(await statusOf(due2.id)).toBe(OrderStatus.EXPIRED);
    expect(await statusOf(future.id)).toBe(OrderStatus.AWAITING_PAYMENT);
    // Pesanan pelanggan lain tidak tersentuh.
    expect(await statusOf(otherDue.id)).toBe(OrderStatus.AWAITING_PAYMENT);
  });

  it("getCustomerOrderByCode menegakkan kedaluwarsa secara lazy", async () => {
    await resetDatabase();

    const now = new Date();
    const { customer, order, voucherId } = await prepareOrder({
      dueAt: new Date(now.getTime() - 60_000),
      withVoucher: true,
    });

    const detail = await getCustomerOrderByCode(customer.id, order.orderCode);

    expect(detail).not.toBeNull();
    expect(detail?.status).toBe(OrderStatus.EXPIRED);
    expect(
      (
        await testPrisma.voucher.findUniqueOrThrow({
          where: { id: voucherId! },
          select: { status: true },
        })
      ).status,
    ).toBe(VoucherStatus.ACTIVE);
  });
});
