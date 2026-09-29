import { describe, expect, it } from "vitest";

import { computeRedemptionRate, parseOutletFilter } from "@/lib/analytics";

describe("parseOutletFilter", () => {
  it("mengembalikan null saat filter kosong atau tidak ada", () => {
    expect(parseOutletFilter(undefined)).toBeNull();
    expect(parseOutletFilter("")).toBeNull();
    expect(parseOutletFilter("   ")).toBeNull();
    expect(parseOutletFilter([])).toBeNull();
  });

  it("mengambil nilai pertama saat parameter berupa larik", () => {
    expect(parseOutletFilter(["outlet-1", "outlet-2"])).toBe("outlet-1");
  });

  it("memangkas spasi di sekitar id outlet", () => {
    expect(parseOutletFilter("  outlet-1  ")).toBe("outlet-1");
  });
});

describe("computeRedemptionRate", () => {
  it("mengembalikan null bila belum ada voucher diterbitkan", () => {
    expect(computeRedemptionRate(0, 0)).toBeNull();
    expect(computeRedemptionRate(5, 0)).toBeNull();
  });

  it("menghitung rasio terpakai dibagi diterbitkan", () => {
    expect(computeRedemptionRate(5, 10)).toBe(0.5);
    expect(computeRedemptionRate(3, 4)).toBe(0.75);
  });

  it("mengembalikan 0 saat tidak ada voucher terpakai", () => {
    expect(computeRedemptionRate(0, 10)).toBe(0);
  });
});
