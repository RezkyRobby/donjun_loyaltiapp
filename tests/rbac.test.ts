import { describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/enums";
import { homeForRole, matchRoute } from "@/lib/rbac";

describe("matchRoute", () => {
  it("memetakan rute belanja pelanggan ke CUSTOMER saja", () => {
    for (const pathname of [
      "/belanja",
      "/belanja/menu-1",
      "/keranjang",
      "/pesanan",
      "/pesanan/ORD-23456789AB",
    ]) {
      const rule = matchRoute(pathname);

      expect(rule).not.toBeNull();
      expect(rule?.roles).toEqual([UserRole.CUSTOMER]);
    }
  });

  it("memetakan area kasir dan admin ke peran yang tepat", () => {
    expect(matchRoute("/kasir/pesanan")?.roles).toEqual([
      UserRole.CASHIER,
      UserRole.SUPER_ADMIN,
    ]);
    expect(matchRoute("/admin/menu")?.roles).toEqual([UserRole.SUPER_ADMIN]);
  });

  it("menghormati batas segmen prefix", () => {
    expect(matchRoute("/pesanan-lain")).toBeNull();
    expect(matchRoute("/belanjaan")).toBeNull();
  });

  it("tidak memetakan rute publik", () => {
    expect(matchRoute("/")).toBeNull();
    expect(matchRoute("/kebijakan-privasi")).toBeNull();
  });
});

describe("homeForRole", () => {
  it("mengembalikan beranda per peran", () => {
    expect(homeForRole(UserRole.CUSTOMER)).toBe("/dashboard");
    expect(homeForRole(UserRole.CASHIER)).toBe("/kasir/scan");
    expect(homeForRole(UserRole.SUPER_ADMIN)).toBe("/admin");
  });

  it("jatuh ke beranda pelanggan bila peran null", () => {
    expect(homeForRole(null)).toBe("/dashboard");
  });
});
