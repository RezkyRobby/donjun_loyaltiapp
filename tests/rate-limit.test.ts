import { describe, expect, it } from "vitest";

import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("mengizinkan sampai batas lalu menolak dengan sisa waktu tunggu", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

    expect(limiter.consume("ip", 0)).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.consume("ip", 1_000)).toEqual({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.consume("ip", 2_000)).toEqual({
      allowed: true,
      remaining: 0,
    });

    expect(limiter.consume("ip", 3_000)).toEqual({
      allowed: false,
      reason: "LIMIT",
      retryAfterSeconds: 57,
    });
  });

  it("mengizinkan kembali setelah jendela berlalu", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

    limiter.consume("ip", 0);
    expect(limiter.check("ip", 30_000).allowed).toBe(false);
    expect(limiter.check("ip", 60_001).allowed).toBe(true);
  });

  it("menegakkan jeda minimum antar permintaan", () => {
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      minIntervalMs: 10_000,
    });

    expect(limiter.consume("email", 0).allowed).toBe(true);
    expect(limiter.check("email", 5_000)).toEqual({
      allowed: false,
      reason: "COOLDOWN",
      retryAfterSeconds: 5,
    });
    expect(limiter.check("email", 10_000).allowed).toBe(true);
  });

  it("memisahkan hitungan per kunci", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

    expect(limiter.consume("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(false);
    expect(limiter.check("b", 1).allowed).toBe(true);
  });

  it("tidak mencatat permintaan pada check", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });

    limiter.check("ip", 0);
    limiter.check("ip", 0);

    expect(limiter.consume("ip", 0).allowed).toBe(true);
  });
});
