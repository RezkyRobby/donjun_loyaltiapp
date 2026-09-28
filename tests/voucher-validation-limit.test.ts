import { describe, expect, it } from "vitest";

import {
  checkVoucherValidationLimit,
  describeVoucherRateLimit,
  recordVoucherValidationFailure,
} from "@/server/kasir/voucher-validation-limit";

// PRD §9: maksimal 10 kegagalan validasi voucher per menit per kasir. Setiap
// test memakai id kasir unik karena limiter menyimpan riwayat di tingkat modul.
describe("rate limit kegagalan validasi voucher", () => {
  it("mengizinkan 10 kegagalan lalu memblokir percobaan berikutnya", () => {
    const cashier = "kasir-batas";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(checkVoucherValidationLimit(cashier, 0).allowed).toBe(true);
      recordVoucherValidationFailure(cashier, 0);
    }

    const blocked = checkVoucherValidationLimit(cashier, 0);
    expect(blocked.allowed).toBe(false);

    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBe(60);
    }
  });

  it("pemeriksaan (check) tidak menambah hitungan kegagalan", () => {
    const cashier = "kasir-check";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      checkVoucherValidationLimit(cashier, 0);
    }

    expect(checkVoucherValidationLimit(cashier, 0).allowed).toBe(true);
  });

  it("memisahkan kuota antar kasir", () => {
    const limited = "kasir-terbatas";
    const other = "kasir-lain";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      recordVoucherValidationFailure(limited, 0);
    }

    expect(checkVoucherValidationLimit(limited, 0).allowed).toBe(false);
    expect(checkVoucherValidationLimit(other, 0).allowed).toBe(true);
  });

  it("mengizinkan kembali setelah jendela satu menit berlalu", () => {
    const cashier = "kasir-jendela";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      recordVoucherValidationFailure(cashier, 0);
    }

    expect(checkVoucherValidationLimit(cashier, 59_000).allowed).toBe(false);
    expect(checkVoucherValidationLimit(cashier, 60_000).allowed).toBe(true);
  });

  it("pesan rate limit menyebut sisa waktu tunggu", () => {
    expect(describeVoucherRateLimit(42)).toContain("42 detik");
  });
});
