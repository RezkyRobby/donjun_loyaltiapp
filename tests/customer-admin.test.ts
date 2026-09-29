import { describe, expect, it } from "vitest";

import {
  CUSTOMER_ADMIN_SEARCH_MAX,
  customerAdminSearchSchema,
  customerIdSchema,
  setCustomerActiveSchema,
} from "@/lib/customer-admin";

describe("customerAdminSearchSchema", () => {
  it("menormalkan kata kunci ke huruf kecil dan menyingkirkan awalan @", () => {
    const result = customerAdminSearchSchema.safeParse("  @Budi.Santoso ");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("budi.santoso");
  });

  it("menerima kata kunci kosong sebagai tanpa filter", () => {
    const result = customerAdminSearchSchema.safeParse("   ");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("");
  });

  it("menolak kata kunci yang terlalu panjang", () => {
    const result = customerAdminSearchSchema.safeParse(
      "a".repeat(CUSTOMER_ADMIN_SEARCH_MAX + 1),
    );

    expect(result.success).toBe(false);
  });

  it("menolak wildcard SQL tetapi mengizinkan garis bawah username", () => {
    expect(customerAdminSearchSchema.safeParse("%admin%").success).toBe(false);
    expect(customerAdminSearchSchema.safeParse("budi_santoso").success).toBe(
      true,
    );
  });
});

describe("customerIdSchema", () => {
  it("menerima id yang sah dan menolak id kosong", () => {
    expect(customerIdSchema.safeParse("clx123").success).toBe(true);
    expect(customerIdSchema.safeParse("   ").success).toBe(false);
  });
});

describe("setCustomerActiveSchema", () => {
  it("menerima id dan status boolean", () => {
    const result = setCustomerActiveSchema.safeParse({
      id: "clx123",
      isActive: false,
    });

    expect(result.success).toBe(true);
  });

  it("menolak status yang bukan boolean", () => {
    expect(
      setCustomerActiveSchema.safeParse({ id: "clx123", isActive: "true" })
        .success,
    ).toBe(false);
  });

  it("menolak id kosong", () => {
    expect(
      setCustomerActiveSchema.safeParse({ id: "", isActive: true }).success,
    ).toBe(false);
  });
});
