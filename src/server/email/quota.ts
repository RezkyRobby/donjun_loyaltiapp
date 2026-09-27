import {
  createRateLimiter,
  RATE_LIMITS,
  type RateLimitReason,
} from "@/lib/rate-limit";

// Kuota email transaksional (PRD §9): maksimal 5 email per akun per hari dengan
// jeda minimal 60 detik antar permintaan. Mekanisme pembatasan memakai helper
// rate limit publik; modul ini hanya membungkusnya dengan pesan Bahasa Indonesia
// khusus email.
const limiter = createRateLimiter(RATE_LIMITS.transactionalEmail);

export type EmailQuotaReason = RateLimitReason;

export type EmailQuotaStatus =
  | { allowed: true }
  | { allowed: false; reason: EmailQuotaReason; retryAfterSeconds: number };

export class EmailQuotaError extends Error {
  readonly reason: EmailQuotaReason;
  readonly retryAfterSeconds: number;

  constructor(reason: EmailQuotaReason, retryAfterSeconds: number) {
    super(quotaMessage(reason, retryAfterSeconds));
    this.name = "EmailQuotaError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function quotaMessage(
  reason: EmailQuotaReason,
  retryAfterSeconds: number,
): string {
  if (reason === "COOLDOWN") {
    return `Mohon tunggu ${retryAfterSeconds} detik sebelum meminta email baru untuk akun ini.`;
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Batas 5 email per akun per hari telah tercapai. Coba lagi dalam ${minutes} menit.`;
}

function normalizeAccount(email: string): string {
  return email.trim().toLowerCase();
}

export function checkEmailQuota(
  email: string,
  now: number = Date.now(),
): EmailQuotaStatus {
  const decision = limiter.check(normalizeAccount(email), now);

  if (decision.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: decision.reason,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

// Mencatat satu permintaan setelah lolos kuota, dipanggil sesaat sebelum email
// dikirim. Permintaan yang gagal di tengah jalan tetap terhitung agar percobaan
// berulang tidak dapat dipakai untuk melampaui batas harian.
export function consumeEmailQuota(
  email: string,
  now: number = Date.now(),
): void {
  const decision = limiter.consume(normalizeAccount(email), now);

  if (!decision.allowed) {
    throw new EmailQuotaError(decision.reason, decision.retryAfterSeconds);
  }
}
