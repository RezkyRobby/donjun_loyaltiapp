import type { OrderStatus } from "@/generated/prisma/enums";

// Batas waktu pembayaran pesanan belanja (PRD §5.4 fitur 5, NFR §9). Tenggat
// default 24 jam dan dapat dikonfigurasi lewat ORDER_PAYMENT_WINDOW_MINUTES
// tanpa mengubah skema. Kedaluwarsa ditegakkan *lazy* saat data diakses —
// tanpa cron — sehingga helper murni ini dipakai di Server Action/Route Handler.

export const DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES = 1440;

const MINUTES_PER_MS = 60_000;

export function getOrderPaymentWindowMinutes(): number {
  const parsed = Number.parseInt(
    process.env.ORDER_PAYMENT_WINDOW_MINUTES ?? "",
    10,
  );

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES;
  }

  return parsed;
}

// Tenggat pembayaran = waktu pembuatan pesanan + jendela pembayaran.
export function getPaymentDueAt(
  createdAt: Date,
  windowMinutes: number = getOrderPaymentWindowMinutes(),
): Date {
  return new Date(createdAt.getTime() + windowMinutes * MINUTES_PER_MS);
}

// `true` bila tenggat sudah terlewati. Tepat pada tenggat masih dianggap belum
// lewat (dibandingkan secara ketat).
export function isPaymentWindowExpired(
  paymentDueAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() > paymentDueAt.getTime();
}

// Ambang "mendekati tenggat" untuk penanda peringatan pada kartu pesanan
// (design.md §9.7): kurang dari 6 jam tersisa ditampilkan dengan warna
// peringatan disertai ikon dan teks.
export const PAYMENT_DUE_SOON_THRESHOLD_MINUTES = 360;

// `true` bila sisa waktu menuju tenggat kurang dari ambang peringatan.
export function isPaymentDueSoon(
  paymentDueAt: Date,
  now: Date = new Date(),
): boolean {
  return (
    paymentDueAt.getTime() - now.getTime() <
    PAYMENT_DUE_SOON_THRESHOLD_MINUTES * MINUTES_PER_MS
  );
}

// Pesanan hanya ditandai EXPIRED bila masih AWAITING_PAYMENT dan tenggatnya
// sudah lewat (PRD §8.7). Status lanjutan tidak boleh diubah oleh penegakan lazy.
export function shouldExpireOrder(
  status: OrderStatus,
  paymentDueAt: Date,
  now: Date = new Date(),
): boolean {
  return status === "AWAITING_PAYMENT" && isPaymentWindowExpired(paymentDueAt, now);
}
