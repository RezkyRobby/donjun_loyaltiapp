import { describe, expect, it } from "vitest";

import {
  requestPasswordResetSchema,
  resetPasswordFormSchema,
} from "@/lib/password-reset";

describe("requestPasswordResetSchema", () => {
  it("menerima email valid dan menormalkannya ke huruf kecil", () => {
    const parsed = requestPasswordResetSchema.parse({
      email: "  Budi@Example.COM ",
    });

    expect(parsed.email).toBe("budi@example.com");
  });

  it("menolak email tidak valid", () => {
    expect(
      requestPasswordResetSchema.safeParse({ email: "bukan-email" }).success,
    ).toBe(false);
  });
});

describe("resetPasswordFormSchema", () => {
  it("menerima kata sandi baru yang cocok dan minimal 8 karakter", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        password: "rahasia123",
        confirmPassword: "rahasia123",
      }).success,
    ).toBe(true);
  });

  it("menolak kata sandi kurang dari 8 karakter", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        password: "pendek",
        confirmPassword: "pendek",
      }).success,
    ).toBe(false);
  });

  it("menolak konfirmasi yang tidak cocok", () => {
    const result = resetPasswordFormSchema.safeParse({
      password: "rahasia123",
      confirmPassword: "berbeda123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });
});
