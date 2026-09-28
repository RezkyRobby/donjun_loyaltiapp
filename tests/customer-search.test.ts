import { describe, expect, it } from "vitest";

import {
  customerSearchQuerySchema,
  escapeLikePattern,
  normalizeCustomerSearchQuery,
} from "@/lib/customer-search";

describe("normalizeCustomerSearchQuery", () => {
  it("memangkas spasi, menurunkan huruf, dan membuang tanda @", () => {
    expect(normalizeCustomerSearchQuery("  @Budi.Santoso ")).toBe(
      "budi.santoso",
    );
  });
});

describe("customerSearchQuerySchema", () => {
  it("menerima awalan minimal 3 karakter", () => {
    expect(customerSearchQuerySchema.safeParse("budi").success).toBe(true);
  });

  it("menolak awalan yang terlalu pendek", () => {
    expect(customerSearchQuerySchema.safeParse("bu").success).toBe(false);
  });

  it("menolak karakter di luar charset username", () => {
    expect(customerSearchQuerySchema.safeParse("bu di").success).toBe(false);
  });
});

describe("escapeLikePattern", () => {
  it("membiarkan karakter biasa apa adanya", () => {
    expect(escapeLikePattern("budi.santoso")).toBe("budi.santoso");
  });

  it("meloloskan garis bawah dan persen", () => {
    expect(escapeLikePattern("bu_di%")).toBe("bu\\_di\\%");
  });

  it("meloloskan backslash", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });
});
