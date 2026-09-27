import { describe, expect, it } from "vitest";

import {
  generateUniqueVoucherCode,
  generateVoucherCode,
  isVoucherCode,
  normalizeVoucherCode,
  voucherCodeSchema,
  VOUCHER_ALPHABET,
  VOUCHER_CODE_PATTERN,
  VOUCHER_PREFIX,
} from "@/lib/voucher-code";

describe("generateVoucherCode", () => {
  it("memakai format DJN- + 16 karakter", () => {
    const code = generateVoucherCode();

    expect(code.startsWith(VOUCHER_PREFIX)).toBe(true);
    expect(code).toHaveLength(VOUCHER_PREFIX.length + 16);
  });

  it("hanya memakai alfabet non-ambigu", () => {
    for (const forbidden of ["0", "O", "1", "I", "L"]) {
      expect(VOUCHER_ALPHABET).not.toContain(forbidden);
    }

    for (let attempt = 0; attempt < 200; attempt += 1) {
      expect(generateVoucherCode()).toMatch(VOUCHER_CODE_PATTERN);
    }
  });
});

describe("normalizeVoucherCode", () => {
  it("memangkas spasi dan mengubah ke huruf besar", () => {
    expect(normalizeVoucherCode("  djn-abc  ")).toBe("DJN-ABC");
  });
});

describe("isVoucherCode", () => {
  it("menerima kode valid secara case-insensitive", () => {
    expect(isVoucherCode("djn-23456789ABCDEFGH")).toBe(true);
    expect(isVoucherCode("DJN-23456789ABCDEFGH")).toBe(true);
  });

  it("menolak kode dengan panjang atau karakter salah", () => {
    expect(isVoucherCode("DJN-23456789ABCDEFG")).toBe(false);
    expect(isVoucherCode("ABC-23456789ABCDEFGH")).toBe(false);
    expect(isVoucherCode("DJN-0000000000000000")).toBe(false);
  });
});

describe("voucherCodeSchema", () => {
  it("menormalkan input manual ke huruf besar", () => {
    expect(voucherCodeSchema.parse("djn-23456789abcdefgh")).toBe(
      "DJN-23456789ABCDEFGH",
    );
  });

  it("menolak kode tidak valid", () => {
    expect(voucherCodeSchema.safeParse("DJN-123").success).toBe(false);
  });
});

describe("generateUniqueVoucherCode", () => {
  it("mencoba ulang saat kode sudah terpakai lalu mengembalikan kode bebas", async () => {
    let attempts = 0;

    const code = await generateUniqueVoucherCode(async () => {
      attempts += 1;
      return attempts <= 2;
    });

    expect(attempts).toBe(3);
    expect(isVoucherCode(code)).toBe(true);
  });

  it("melempar galat setelah batas percobaan habis", async () => {
    await expect(
      generateUniqueVoucherCode(async () => true, { maxAttempts: 3 }),
    ).rejects.toThrow(/3 percobaan/);
  });
});
