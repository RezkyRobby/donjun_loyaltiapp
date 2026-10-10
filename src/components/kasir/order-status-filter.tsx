import Link from "next/link";

import { ORDER_STATUS_LABELS } from "@/constants/labels";
import { OrderStatus } from "@/generated/prisma/enums";
import type { OrderStatusFilter } from "@/lib/order";
import { cn } from "@/lib/utils";

// Filter status antrean pesanan kasir (PRD §5.5 fitur 1). Tautan query string
// sehingga tetap berfungsi tanpa JavaScript; status aktif dibawa warna,
// aria-current, dan posisi sekaligus (design.md §11, register *product*).
// Setiap tautan mereset halaman ke 1 agar hasil filter selalu konsisten.
const WORKFLOW_STATUSES: OrderStatus[] = [
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.AWAITING_CONFIRMATION,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
  OrderStatus.EXPIRED,
  OrderStatus.CANCELED,
];

const FILTER_OPTIONS: { value: OrderStatusFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  ...WORKFLOW_STATUSES.map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
];

export function OrderStatusFilter({
  active,
}: {
  active: OrderStatusFilter;
}) {
  return (
    <nav aria-label="Filter status pesanan">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option.value === active;
          const href =
            option.value === "ALL"
              ? "/kasir/pesanan"
              : `/kasir/pesanan?status=${option.value}`;

          return (
            <li key={option.value} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-badge border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "border-brand-orange bg-brand-orange text-brand-brown-dark"
                    : "border-border bg-card text-brand-brown-muted hover:bg-muted hover:text-brand-brown-dark",
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
