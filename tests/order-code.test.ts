import { describe, expect, it } from "vitest";

import {
  generateOrderCode,
  generateUniqueOrderCode,
  isOrderCode,
  normalizeOrderCode,
  orderCodeSchema,
  ORDER_ALPHABET,
  ORDER_CODE_PATTERN,
  ORDER_PREFIX,
} from "@/lib/order-code";

describe("generateOrderCode", () => {
  it("memakai format ORD- + 10 karakter", () => {
    const code = generateOrderCode();

    expect(code.startsWith(ORDER_PREFIX)).toBe(true);
    expect(code).toHaveLength(ORDER_PREFIX.length + 10);
  });

  it("hanya memakai alfabet non-ambigu", () => {
    for (const forbidden of ["0", "O", "1", "I", "L"]) {
      expect(ORDER_ALPHABET).not.toContain(forbidden);
    }

    for (let attempt = 0; attempt < 200; attempt += 1) {
      expect(generateOrderCode()).toMatch(ORDER_CODE_PATTERN);
    }
  });
});

describe("normalizeOrderCode", () => {
  it("memangkas spasi dan mengubah ke huruf besar", () => {
    expect(normalizeOrderCode("  ord-abc  ")).toBe("ORD-ABC");
  });
});

describe("isOrderCode", () => {
  it("menerima kode valid secara case-insensitive", () => {
    expect(isOrderCode("ord-23456789AB")).toBe(true);
    expect(isOrderCode("ORD-23456789AB")).toBe(true);
  });

  it("menolak kode dengan panjang atau karakter salah", () => {
    expect(isOrderCode("ORD-23456789A")).toBe(false);
    expect(isOrderCode("ABC-23456789AB")).toBe(false);
    expect(isOrderCode("ORD-0000000000")).toBe(false);
  });
});

describe("orderCodeSchema", () => {
  it("menormalkan input ke huruf besar", () => {
    expect(orderCodeSchema.parse("ord-23456789ab")).toBe("ORD-23456789AB");
  });

  it("menolak kode tidak valid", () => {
    expect(orderCodeSchema.safeParse("ORD-123").success).toBe(false);
  });
});

describe("generateUniqueOrderCode", () => {
  it("mencoba ulang saat kode sudah terpakai lalu mengembalikan kode bebas", async () => {
    let attempts = 0;

    const code = await generateUniqueOrderCode(async () => {
      attempts += 1;
      return attempts <= 2;
    });

    expect(attempts).toBe(3);
    expect(isOrderCode(code)).toBe(true);
  });

  it("melempar galat setelah batas percobaan habis", async () => {
    await expect(
      generateUniqueOrderCode(async () => true, { maxAttempts: 3 }),
    ).rejects.toThrow(/3 percobaan/);
  });
});
