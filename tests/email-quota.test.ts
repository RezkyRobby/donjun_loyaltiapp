import { describe, expect, it } from "vitest";

import {
  checkEmailQuota,
  consumeEmailQuota,
  EmailQuotaError,
} from "@/server/email/quota";

const BASE = Date.UTC(2026, 8, 27, 0, 0, 0);

describe("kuota email transaksional", () => {
  it("menolak permintaan kedua dalam 60 detik", () => {
    const email = "cooldown@example.com";

    consumeEmailQuota(email, BASE);

    expect(checkEmailQuota(email, BASE + 10_000)).toEqual({
      allowed: false,
      reason: "COOLDOWN",
      retryAfterSeconds: 50,
    });
    expect(() => consumeEmailQuota(email, BASE + 10_000)).toThrow(
      EmailQuotaError,
    );
  });

  it("membatasi 5 email per akun per 24 jam", () => {
    const email = "limit@example.com";

    for (let index = 0; index < 5; index += 1) {
      consumeEmailQuota(email, BASE + index * 60_000);
    }

    const status = checkEmailQuota(email, BASE + 5 * 60_000);

    expect(status.allowed).toBe(false);
    if (!status.allowed) {
      expect(status.reason).toBe("LIMIT");
    }
  });

  it("mengizinkan kembali setelah jendela 24 jam berlalu", () => {
    const email = "window@example.com";

    for (let index = 0; index < 5; index += 1) {
      consumeEmailQuota(email, BASE + index * 60_000);
    }

    expect(checkEmailQuota(email, BASE + 24 * 60 * 60_000 + 1).allowed).toBe(
      true,
    );
  });

  it("memisahkan kuota per alamat email", () => {
    consumeEmailQuota("satu@example.com", BASE);

    expect(checkEmailQuota("dua@example.com", BASE + 1_000).allowed).toBe(true);
  });
});
