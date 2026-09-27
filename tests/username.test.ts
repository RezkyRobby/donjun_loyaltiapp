import { describe, expect, it } from "vitest";

import {
  isValidUsernameFormat,
  normalizeUsername,
  usernameSchema,
} from "@/lib/username";

describe("usernameSchema", () => {
  it("menerima username valid 8–20 karakter", () => {
    const valid = [
      "donat234",
      "budi.donat",
      "budi_donat",
      "pelanggan.setia2026",
      "a".repeat(20),
    ];

    for (const value of valid) {
      expect(usernameSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it("menormalkan hasil ke huruf kecil", () => {
    expect(usernameSchema.parse("Budi.Donat")).toBe("budi.donat");
  });

  it("menolak panjang di luar 8–20 karakter", () => {
    expect(usernameSchema.safeParse("budi.do").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("menolak karakter dan pola yang tidak diizinkan", () => {
    const invalid = [
      "1budi.donat",
      ".budi.donat",
      "_budi.donat",
      "budi.donat.",
      "budi.donat_",
      "budi-donat",
      "budi donat",
      "budi@donat",
      "budi/donat",
    ];

    for (const value of invalid) {
      expect(usernameSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("menolak reserved username tanpa memperhatikan huruf besar/kecil", () => {
    const reserved = [
      "password",
      "Password",
      "official",
      "username",
      "customer",
      "donjun_donat",
      "donjundonat",
    ];

    for (const value of reserved) {
      expect(usernameSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("memberi pesan khusus untuk reserved username", () => {
    const result = usernameSchema.safeParse("password");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("tidak diizinkan");
    }
  });
});

describe("normalizeUsername", () => {
  it("memangkas spasi dan menurunkan ke huruf kecil", () => {
    expect(normalizeUsername("  Budi.Donat  ")).toBe("budi.donat");
  });
});

describe("isValidUsernameFormat", () => {
  it("menerapkan aturan secara case-insensitive", () => {
    expect(isValidUsernameFormat("Budi.Donat")).toBe(true);
    expect(isValidUsernameFormat("budi.donat")).toBe(true);
    expect(isValidUsernameFormat("budi.do")).toBe(false);
  });
});
