import { ChevronRight, Images } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PaymentDeadline } from "@/components/customer/payment-deadline";
import { OrderStatus } from "@/generated/prisma/enums";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatCount, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CashierOrderSummary } from "@/server/kasir/order-list";

// Kartu ringkasan pesanan pada antrean kasir (PRD §5.5 fitur 1). Register
// *product* (design.md §2): padat, tenang, tanpa animasi dekoratif. Pesanan
// yang menunggu keputusan kasir diberi aksen border agar mudah dipindai.
const ACTIONABLE_BORDER: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.AWAITING_CONFIRMATION]: "border-sky-pastel",
  [OrderStatus.IN_PROGRESS]: "border-donut-matcha/40",
};

export function OrderQueueCard({ order }: { order: CashierOrderSummary }) {
  const actionableBorder = ACTIONABLE_BORDER[order.status];

  return (
    <Link
      href={`/kasir/pesanan/${order.id}`}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-card p-4 transition-colors hover:bg-warm-neutral/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        actionableBorder ?? "border-warm-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.08em] text-brand-brown-dark">
            {order.orderCode}
          </span>
          <span className="text-caption text-brand-brown-muted">
            {formatDateTimeWita(order.createdAt)} WITA
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-brand-brown-dark">
          {order.customerName}
          {order.customerUsername ? (
            <span className="font-normal text-brand-brown-muted">
              {" "}
              @{order.customerUsername}
            </span>
          ) : null}
        </p>
        <p className="flex items-center gap-1.5 text-caption text-brand-brown-muted">
          <Images aria-hidden className="size-3.5 shrink-0" />
          {formatCount(order.itemCount)} jenis menu ·{" "}
          {formatCount(order.proofCount)} bukti transfer
        </p>
      </div>

      {order.status === OrderStatus.AWAITING_PAYMENT ? (
        <PaymentDeadline paymentDueAt={order.paymentDueAt} />
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-warm-border pt-3">
        <span className="text-sm text-brand-brown-muted">Total</span>
        <span className="flex items-center gap-1 font-display text-lg font-bold tabular-nums text-brand-brown-dark">
          {formatRupiah(order.total)}
          <ChevronRight aria-hidden className="size-4 text-brand-brown-muted" />
        </span>
      </div>
    </Link>
  );
}
