// Kuota email transaksional (PRD §9): maksimal 5 email per akun per hari dengan
// jeda minimal 60 detik antar permintaan. Batas dihitung per alamat email dan
// disimpan di memori proses, sejalan dengan penanganan rate limit Better-Auth
// pada Fase 1. Saat helper rate limit publik terpusat dibangun (Fase 1 Task 8)
// penyimpanan dapat dipindahkan ke store bersama tanpa mengubah pemanggil.

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;
const MAX_EMAILS_PER_WINDOW = 5;

export type EmailQuotaReason = "COOLDOWN" | "DAILY_LIMIT";

export type EmailQuotaStatus =
  | { allowed: true }
  | { allowed: false; reason: EmailQuotaReason; retryAfterSeconds: number };

const sentAtByAccount = new Map<string, number[]>();

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

// Mengembalikan pengiriman dalam 24 jam terakhir, sekaligus memangkas riwayat
// yang sudah keluar dari jendela agar penyimpanan tidak tumbuh tanpa batas.
function recentSends(account: string, now: number): number[] {
  const timestamps = sentAtByAccount.get(account) ?? [];
  const recent = timestamps.filter((sentAt) => now - sentAt < WINDOW_MS);

  if (recent.length === 0) {
    sentAtByAccount.delete(account);
  } else {
    sentAtByAccount.set(account, recent);
  }

  return recent;
}

export function checkEmailQuota(
  email: string,
  now: number = Date.now(),
): EmailQuotaStatus {
  const timestamps = recentSends(normalizeAccount(email), now);

  const lastSentAt = timestamps[timestamps.length - 1];
  if (lastSentAt !== undefined && now - lastSentAt < MIN_INTERVAL_MS) {
    return {
      allowed: false,
      reason: "COOLDOWN",
      retryAfterSeconds: Math.ceil(
        (MIN_INTERVAL_MS - (now - lastSentAt)) / 1000,
      ),
    };
  }

  if (timestamps.length >= MAX_EMAILS_PER_WINDOW) {
    return {
      allowed: false,
      reason: "DAILY_LIMIT",
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - timestamps[0])) / 1000),
    };
  }

  return { allowed: true };
}

// Mencatat satu permintaan setelah lolos kuota, dipanggil sesaat sebelum email
// dikirim. Permintaan yang gagal di tengah jalan tetap terhitung agar percobaan
// berulang tidak dapat dipakai untuk melampaui batas harian.
export function consumeEmailQuota(
  email: string,
  now: number = Date.now(),
): void {
  const status = checkEmailQuota(email, now);

  if (!status.allowed) {
    throw new EmailQuotaError(status.reason, status.retryAfterSeconds);
  }

  const account = normalizeAccount(email);
  const timestamps = recentSends(account, now);
  timestamps.push(now);
  sentAtByAccount.set(account, timestamps);
}
