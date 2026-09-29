import { describe, expect, it } from "vitest";

import { buildStaffActivationUrl, staffCreateSchema } from "@/lib/staff-admin";

const baseInput = {
  name: "Kasir Panakkukang",
  email: "kasir@donjun.test",
  outletId: "outlet-1",
};

describe("staffCreateSchema", () => {
  it("menerima data staf yang sah dan menormalkan email", () => {
    const parsed = staffCreateSchema.safeParse({
      ...baseInput,
      email: "Kasir@Donjun.Test",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.email).toBe("kasir@donjun.test");
    expect(parsed.data.name).toBe("Kasir Panakkukang");
  });

  it("menolak nama yang terlalu pendek", () => {
    expect(
      staffCreateSchema.safeParse({ ...baseInput, name: "A" }).success,
    ).toBe(false);
  });

  it("menolak email yang tidak valid", () => {
    expect(
      staffCreateSchema.safeParse({ ...baseInput, email: "bukan-email" })
        .success,
    ).toBe(false);
  });

  it("mewajibkan outlet penugasan", () => {
    expect(
      staffCreateSchema.safeParse({ ...baseInput, outletId: "" }).success,
    ).toBe(false);
    expect(
      staffCreateSchema.safeParse({ ...baseInput, outletId: "   " }).success,
    ).toBe(false);
  });
});

describe("buildStaffActivationUrl", () => {
  it("mengarahkan ke halaman reset dengan token", () => {
    expect(buildStaffActivationUrl("http://localhost:3000", "abc123")).toBe(
      "http://localhost:3000/reset-sandi?token=abc123",
    );
  });

  it("menghapus garis miring di akhir base URL", () => {
    expect(buildStaffActivationUrl("https://donjun.test/", "tok")).toBe(
      "https://donjun.test/reset-sandi?token=tok",
    );
  });

  it("meng-encode token agar aman pada query string", () => {
    expect(buildStaffActivationUrl("https://donjun.test", "a/b+c=")).toBe(
      "https://donjun.test/reset-sandi?token=a%2Fb%2Bc%3D",
    );
  });
});
