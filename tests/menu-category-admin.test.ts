import { describe, expect, it } from "vitest";

import {
  menuCategoryFormSchema,
  menuCategoryIdSchema,
} from "@/lib/menu-category-admin";

const baseInput = {
  name: "Donat",
  sortOrder: "0",
  isActive: true,
};

describe("menuCategoryFormSchema", () => {
  it("menerima input sah dan mengubah urutan menjadi bilangan", () => {
    const parsed = menuCategoryFormSchema.safeParse({
      ...baseInput,
      sortOrder: "3",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.sortOrder).toBe(3);
  });

  it("menolak nama terlalu pendek atau kosong", () => {
    expect(
      menuCategoryFormSchema.safeParse({ ...baseInput, name: "" }).success,
    ).toBe(false);
    expect(
      menuCategoryFormSchema.safeParse({ ...baseInput, name: "a" }).success,
    ).toBe(false);
  });

  it("menolak urutan negatif atau bukan angka", () => {
    expect(
      menuCategoryFormSchema.safeParse({ ...baseInput, sortOrder: "-1" })
        .success,
    ).toBe(false);
    expect(
      menuCategoryFormSchema.safeParse({ ...baseInput, sortOrder: "abc" })
        .success,
    ).toBe(false);
  });
});

describe("menuCategoryIdSchema", () => {
  it("menerima id dan menolak yang kosong", () => {
    expect(menuCategoryIdSchema.safeParse("category-1").success).toBe(true);
    expect(menuCategoryIdSchema.safeParse("").success).toBe(false);
  });
});
