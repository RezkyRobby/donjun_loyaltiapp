import { describe, expect, it } from "vitest";

import {
  changePasswordFormSchema,
  changePasswordSchema,
  profileUpdateSchema,
} from "@/lib/settings";

describe("profileUpdateSchema", () => {
  it("menerima nama dan nomor telepon valid", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Budi Donat",
      phone: "081234567890",
    });

    expect(result.success).toBe(true);
  });

  it("membolehkan nomor telepon dikosongkan", () => {
    expect(
      profileUpdateSchema.safeParse({ name: "Budi", phone: "" }).success,
    ).toBe(true);
    expect(profileUpdateSchema.safeParse({ name: "Budi" }).success).toBe(true);
  });

  it("menolak nama yang terlalu pendek", () => {
    const result = profileUpdateSchema.safeParse({ name: "B", phone: "" });

    expect(result.success).toBe(false);
  });

  it("menolak nomor telepon berformat salah", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Budi",
      phone: "abc",
    });

    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("menolak kata sandi baru yang terlalu pendek", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "lamasaya123",
      newPassword: "pendek",
    });

    expect(result.success).toBe(false);
  });

  it("menerima kata sandi baru yang memenuhi panjang minimum", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "lamasaya123",
      newPassword: "barusaya456",
    });

    expect(result.success).toBe(true);
  });
});

describe("changePasswordFormSchema", () => {
  it("menolak konfirmasi yang tidak cocok", () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: "lamasaya123",
      newPassword: "barusaya456",
      confirmPassword: "barusaya457",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("menerima konfirmasi yang cocok", () => {
    expect(
      changePasswordFormSchema.safeParse({
        currentPassword: "lamasaya123",
        newPassword: "barusaya456",
        confirmPassword: "barusaya456",
      }).success,
    ).toBe(true);
  });
});
