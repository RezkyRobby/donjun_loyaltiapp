// Helper rate limit publik (AGENTS.md aturan 7). Menyimpan riwayat permintaan di
// memori proses, sejalan dengan penanganan rate limit Better-Auth. Nilai batas
// resmi untuk setiap endpoint terpusat pada RATE_LIMITS di bawah; pemasangan ke
// route/action dilakukan pada Task 24.

export type RateLimitReason = "COOLDOWN" | "LIMIT";

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: RateLimitReason; retryAfterSeconds: number };

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  minIntervalMs?: number;
};

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitDecision;
  consume: (key: string, now?: number) => RateLimitDecision;
};

// Batas rate limit endpoint publik (PRD §9).
export const RATE_LIMITS = {
  // Cek ketersediaan username: maks 20 permintaan/menit per IP.
  usernameCheck: { limit: 20, windowMs: 60_000 },
  // Registrasi akun: maks 5 akun/jam per IP.
  registration: { limit: 5, windowMs: 60 * 60_000 },
  // Email transaksional: maks 5 email per akun per hari, jeda minimal 60 detik.
  transactionalEmail: {
    limit: 5,
    windowMs: 24 * 60 * 60_000,
    minIntervalMs: 60_000,
  },
  // Kegagalan validasi voucher: maks 10 per menit per kasir.
  voucherValidationFailure: { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { limit, windowMs, minIntervalMs } = options;
  const requestsByKey = new Map<string, number[]>();

  // Mengembalikan permintaan dalam jendela sekaligus memangkas riwayat yang
  // sudah kedaluwarsa agar penyimpanan tidak tumbuh tanpa batas.
  function recentRequests(key: string, now: number): number[] {
    const timestamps = requestsByKey.get(key) ?? [];
    const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length === 0) {
      requestsByKey.delete(key);
    } else {
      requestsByKey.set(key, recent);
    }

    return recent;
  }

  function evaluate(
    key: string,
    now: number,
  ):
    | { allowed: true; used: number }
    | { allowed: false; reason: RateLimitReason; retryAfterSeconds: number } {
    const timestamps = recentRequests(key, now);
    const lastRequestAt = timestamps[timestamps.length - 1];

    if (
      minIntervalMs !== undefined &&
      lastRequestAt !== undefined &&
      now - lastRequestAt < minIntervalMs
    ) {
      return {
        allowed: false,
        reason: "COOLDOWN",
        retryAfterSeconds: Math.ceil(
          (minIntervalMs - (now - lastRequestAt)) / 1000,
        ),
      };
    }

    if (timestamps.length >= limit) {
      return {
        allowed: false,
        reason: "LIMIT",
        retryAfterSeconds: Math.ceil((windowMs - (now - timestamps[0])) / 1000),
      };
    }

    return { allowed: true, used: timestamps.length };
  }

  return {
    check: (key, now = Date.now()) => {
      const result = evaluate(key, now);
      if (!result.allowed) return result;

      return { allowed: true, remaining: limit - result.used };
    },
    consume: (key, now = Date.now()) => {
      const result = evaluate(key, now);
      if (!result.allowed) return result;

      const timestamps = recentRequests(key, now);
      timestamps.push(now);
      requestsByKey.set(key, timestamps);

      return { allowed: true, remaining: limit - (result.used + 1) };
    },
  };
}
