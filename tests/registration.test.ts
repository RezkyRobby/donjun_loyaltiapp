import { describe, expect, it } from "vitest";

import {
  completeUsernameSchema,
  normalizePhone,
  registrationFormSchema,
  registrationSchema,
  toFieldErrors,
} from "@/lib/registration";

const validInput = {
  name: "Budi Santoso",
  email: "Budi.Santoso@example.com",
  username: "budi.santoso",
  phone: "081234567890",
  password: "rahasia123",
  consent: true,
};

describe("registrationSchema", () => {
  it("menerima data registrasi yang valid", () => {
    const result = registrationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("menormalkan email, username, dan spasi nama", () => {
    const parsed = registrationSchema.parse({
      ...validInput,
      name: "  Budi Santoso  ",
      email: "  Budi.Santoso@Example.COM ",
      username: "Budi.Santoso",
    });

    expect(parsed.email).toBe("budi.santoso@example.com");
    expect(parsed.username).toBe("budi.santoso");
    expect(parsed.name).toBe("Budi Santoso");
  });

  it("menolak email tidak valid", () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      email: "bukan-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).email).toContain("tidak valid");
    }
  });

  it("menolak kata sandi kurang dari 8 karakter", () => {
    expect(
      registrationSchema.safeParse({ ...validInput, password: "pendek" })
        .success,
    ).toBe(false);
  });

  it("menolak username reserved lewat skema terpusat", () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      username: "administrator",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).username).toContain("tidak diizinkan");
    }
  });

  it("mewajibkan persetujuan privasi", () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      consent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).consent).toBeDefined();
    }
  });

  it("menerima nomor telepon kosong sebagai opsional", () => {
    expect(
      registrationSchema.safeParse({ ...validInput, phone: "" }).success,
    ).toBe(true);
  });

  it("menolak nomor telepon berformat salah", () => {
    expect(
      registrationSchema.safeParse({ ...validInput, phone: "telepon" }).success,
    ).toBe(false);
  });
});

describe("registrationFormSchema", () => {
  it("menolak konfirmasi kata sandi yang tidak cocok", () => {
    const result = registrationFormSchema.safeParse({
      ...validInput,
      confirmPassword: "berbeda123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).confirmPassword).toContain("tidak cocok");
    }
  });

  it("menerima konfirmasi yang cocok", () => {
    expect(
      registrationFormSchema.safeParse({
        ...validInput,
        confirmPassword: validInput.password,
      }).success,
    ).toBe(true);
  });
});

describe("completeUsernameSchema", () => {
  it("menolak reserved username", () => {
    expect(completeUsernameSchema.safeParse({ username: "kasir" }).success).toBe(
      false,
    );
  });

  it("menerima username valid", () => {
    expect(
      completeUsernameSchema.safeParse({ username: "budi.donat" }).success,
    ).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("mengubah awalan +62 dan 62 menjadi 0", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("6281234567890")).toBe("081234567890");
    expect(normalizePhone("0812 3456 7890")).toBe("081234567890");
  });
});
