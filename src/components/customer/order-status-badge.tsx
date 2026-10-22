import {
  Ban,
  ChefHat,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { ORDER_STATUS_LABELS } from "@/constants/labels";
import { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

// Peta status pesanan terpusat (design.md §8): setiap status membawa warna,
// ikon, dan label dari kamus src/constants — tidak pernah warna saja.
const STATUS_STYLES: Record<
  OrderStatus,
  { icon: LucideIcon; className: string }
> = {
  [OrderStatus.AWAITING_PAYMENT]: {
    icon: Clock,
    className: "border-brand-orange/40 bg-brand-orange/15 text-brand-orange-deep",
  },
  [OrderStatus.AWAITING_CONFIRMATION]: {
    icon: Hourglass,
    className: "border-sky-pastel bg-sky-pastel/60 text-brand-brown-dark",
  },
  [OrderStatus.IN_PROGRESS]: {
    icon: ChefHat,
    className:
      "border-donut-matcha/40 bg-donut-matcha/10 text-donut-matcha-deep",
  },
  [OrderStatus.COMPLETED]: {
    icon: CircleCheck,
    className:
      "border-donut-matcha/40 bg-donut-matcha/10 text-donut-matcha-deep",
  },
  [OrderStatus.REJECTED]: {
    icon: CircleX,
    className: "border-donut-berry/40 bg-donut-berry/10 text-donut-berry-deep",
  },
  [OrderStatus.EXPIRED]: {
    icon: Ban,
    className: "border-warm-border bg-warm-neutral text-brand-brown-muted",
  },
  [OrderStatus.CANCELED]: {
    icon: XCircle,
    className: "border-warm-border bg-warm-neutral text-brand-brown-muted",
  },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { icon: Icon, className: statusClassName } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-badge border px-3 py-1 text-caption font-medium",
        statusClassName,
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
