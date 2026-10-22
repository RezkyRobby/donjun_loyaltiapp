import { ChevronRight, Store, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PaymentDeadline } from "@/components/customer/payment-deadline";
import { OrderStatus } from "@/generated/prisma/enums";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatCount, formatRupiah } from "@/lib/format";
import type { CustomerOrderSummary } from "@/server/customer/order-list";

// Kartu ringkasan pesanan pada daftar pelacakan (PRD §5.4 fitur 7). Menampilkan
// kode pesanan, status, outlet, jumlah jenis menu, total, dan tenggat
// pembayaran bila masih menunggu pembayaran.
export function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <Link
      href={`/pesanan/${order.orderCode}`}
      className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card transition-colors hover:bg-warm-neutral/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2 text-brand-brown-muted">
          <Store aria-hidden className="size-4 shrink-0" />
          <dt className="sr-only">Outlet</dt>
          <dd className="truncate">{order.outletName}</dd>
        </div>
        <div className="flex items-center gap-2 text-brand-brown-muted">
          <UtensilsCrossed aria-hidden className="size-4 shrink-0" />
          <dt className="sr-only">Jumlah item</dt>
          <dd>{formatCount(order.itemCount)} jenis menu</dd>
        </div>
      </dl>

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
