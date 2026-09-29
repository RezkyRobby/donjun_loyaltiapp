import { describe, expect, it } from "vitest";

import {
  OUTLET_ADDRESS_MAX,
  OUTLET_NAME_MAX,
  outletFormSchema,
  outletIdSchema,
} from "@/lib/outlet-admin";

const baseInput = {
  name: "Donjun Donat Gowa",
  address: "Jl. Sultan Hasanuddin, Sungguminasa, Gowa",
  phone: "0411-000002",
  isActive: true,
};

describe("outletFormSchema", () => {
  it("menerima data outlet yang sah dan memangkas spasi", () => {
    const result = outletFormSchema.safeParse({
      ...baseInput,
      name: "  Donjun Donat Gowa  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Donjun Donat Gowa");
  });

  it("mengubah nomor telepon kosong menjadi null", () => {
    const result = outletFormSchema.safeParse({ ...baseInput, phone: "   " });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeNull();
  });

  it("menolak nomor telepon berformat salah", () => {
    expect(
      outletFormSchema.safeParse({ ...baseInput, phone: "abc" }).success,
    ).toBe(false);
  });

  it("menolak nama atau alamat yang terlalu pendek", () => {
    expect(outletFormSchema.safeParse({ ...baseInput, name: "A" }).success).toBe(
      false,
    );
    expect(
      outletFormSchema.safeParse({ ...baseInput, address: "abc" }).success,
    ).toBe(false);
  });

  it("menolak nama atau alamat yang melebihi batas", () => {
    expect(
      outletFormSchema.safeParse({
        ...baseInput,
        name: "a".repeat(OUTLET_NAME_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      outletFormSchema.safeParse({
        ...baseInput,
        address: "a".repeat(OUTLET_ADDRESS_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("menolak status aktif yang bukan boolean", () => {
    expect(
      outletFormSchema.safeParse({ ...baseInput, isActive: "aktif" }).success,
    ).toBe(false);
  });
});

describe("outletIdSchema", () => {
  it("menerima id yang sah dan menolak id kosong", () => {
    expect(outletIdSchema.safeParse("clx123").success).toBe(true);
    expect(outletIdSchema.safeParse("   ").success).toBe(false);
  });
});
