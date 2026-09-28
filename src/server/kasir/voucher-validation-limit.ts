import { createRateLimiter, RATE_LIMITS } from "@/lib/rate-limit";

// Rate limit kegagalan validasi voucher (PRD §9 & §14): maksimal 10 kegagalan
// pemindaian/input per menit per kasir untuk mencegah enumerasi kode. Hanya
// percobaan yang gagal dihitung — validasi yang berhasil tidak memakai kuota.
// Kunci memakai id kasir sehingga satu kasir tidak dapat melumpuhkan kasir lain.
const limiter = createRateLimiter(RATE_LIMITS.voucherValidationFailure);

export type VoucherValidationLimit =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// Dipanggil sebelum memproses kode: menolak lebih awal saat batas sudah
// tercapai sehingga percobaan lanjutan tidak menyentuh database.
export function checkVoucherValidationLimit(
  cashierId: string,
  now: number = Date.now(),
): VoucherValidationLimit {
  const decision = limiter.check(cashierId, now);

  if (decision.allowed) return { allowed: true };

  return { allowed: false, retryAfterSeconds: decision.retryAfterSeconds };
}

// Dipanggil setiap validasi gagal (kode tidak ditemukan, terpakai, dibatalkan,
// atau format tidak dikenali) untuk mencatat satu percobaan.
export function recordVoucherValidationFailure(
  cashierId: string,
  now: number = Date.now(),
): void {
  limiter.consume(cashierId, now);
}

export function describeVoucherRateLimit(retryAfterSeconds: number): string {
  return `Terlalu banyak percobaan validasi gagal. Tunggu ${retryAfterSeconds} detik lalu coba lagi.`;
}
