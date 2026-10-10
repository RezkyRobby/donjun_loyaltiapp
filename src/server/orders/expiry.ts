import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import type { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/enums";
import { shouldExpireOrder } from "@/lib/payment-window";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/admin/audit";

// Penegakan kedaluwarsa pesanan secara *lazy* (PRD §5.4 fitur 5, NFR §9).
// Tanpa worker/cron: setiap kali data pesanan diakses, pesanan yang masih
// `AWAITING_PAYMENT` dan sudah melewati tenggat ditandai `EXPIRED`, lalu
// dicatat pada AuditLog sebagai aksi sistem. Pembaruan bersifat kondisional
// sehingga tidak menimpa status yang sudah berubah (konfirmasi/batal).
export async function expireOrderIfDue(
  orderId: string,
  now: Date = new Date(),
): Promise<OrderStatus | null> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentDueAt: true,
      },
    });

    if (!order) return null;
    if (!shouldExpireOrder(order.status, order.paymentDueAt, now)) {
      return order.status;
    }

    const updated = await tx.order.updateMany({
      where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT },
      data: { status: OrderStatus.EXPIRED, expiredAt: now },
    });

    if (updated.count === 0) return order.status;

    await recordAuditLog(tx, {
      actorId: null,
      action: AUDIT_ACTION.ORDER_EXPIRED,
      entity: AUDIT_ENTITY.ORDER,
      entityId: order.id,
      metadata: { orderCode: order.orderCode },
    });

    return OrderStatus.EXPIRED;
  });
}

// Menegakkan kedaluwarsa untuk seluruh pesanan yang cocok dengan filter dan
// sudah lewat tenggat; dipakai sebelum menampilkan daftar pesanan.
async function expireDueOrders(
  where: Prisma.OrderWhereInput,
  now: Date,
): Promise<void> {
  const due = await prisma.order.findMany({
    where: {
      ...where,
      status: OrderStatus.AWAITING_PAYMENT,
      paymentDueAt: { lt: now },
    },
    select: { id: true },
  });

  for (const order of due) {
    await expireOrderIfDue(order.id, now);
  }
}

export async function expireDueOrdersForCustomer(
  customerId: string,
  now: Date = new Date(),
): Promise<void> {
  await expireDueOrders({ customerId }, now);
}

export async function expireDueOrdersForOutlet(
  outletId: string,
  now: Date = new Date(),
): Promise<void> {
  await expireDueOrders({ outletId }, now);
}
