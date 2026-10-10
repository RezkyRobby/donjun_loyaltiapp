import { Clock } from "lucide-react";

import { formatDateTimeWita } from "@/lib/datetime";
import { isPaymentDueSoon } from "@/lib/payment-window";
import { cn } from "@/lib/utils";

// Tenggat pembayaran pesanan (design.md §9.7). Ditampilkan hanya pada fase
// AWAITING_PAYMENT; mendekati tenggat memakai warna peringatan disertai ikon dan
// teks, bukan warna saja. Ambang urgensi dihitung di lapisan domain agar
// komponen tetap murni.
export function PaymentDeadline({
  paymentDueAt,
  className,
}: {
  paymentDueAt: Date;
  className?: string;
}) {
  const isUrgent = isPaymentDueSoon(paymentDueAt);

  return (
    <p
      className={cn(
        "flex items-center gap-2 text-sm",
        isUrgent ? "font-medium text-donut-berry-deep" : "text-brand-brown-muted",
        className,
      )}
    >
      <Clock aria-hidden className="size-4 shrink-0" />
      <span>Bayar sebelum {formatDateTimeWita(paymentDueAt)} WITA</span>
    </p>
  );
}
