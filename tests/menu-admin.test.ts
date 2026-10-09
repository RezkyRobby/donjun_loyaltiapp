import { describe, expect, it } from "vitest";

import { menuFormSchema, MENU_MAX_OPTION_GROUPS } from "@/lib/menu-admin";

const baseInput = {
  categoryId: "",
  name: "Donat Glaze",
  description: "",
  price: "8000",
  sortOrder: "0",
  isActive: true,
  optionGroups: [],
};

describe("menuFormSchema", () => {
  it("menerima input sah dan mengubah angka menjadi bilangan bulat", () => {
    const parsed = menuFormSchema.safeParse(baseInput);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.price).toBe(8_000);
    expect(parsed.data.categoryId).toBeNull();
    expect(parsed.data.description).toBeNull();
    expect(parsed.data.optionGroups).toEqual([]);
  });

  it("menerima grup opsi beserta tag", () => {
    const parsed = menuFormSchema.safeParse({
      ...baseInput,
      categoryId: "category-1",
      optionGroups: [
        {
          name: "Rasa",
          sortOrder: "1",
          tags: [
            { name: "Coklat", priceDelta: "1000", sortOrder: "0" },
            { name: "Keju", priceDelta: "2000", sortOrder: "1" },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const group = parsed.data.optionGroups[0];

    expect(group?.name).toBe("Rasa");
    expect(group?.sortOrder).toBe(1);
    expect(group?.tags[0]).toEqual({
      name: "Coklat",
      priceDelta: 1_000,
      sortOrder: 0,
    });
  });

  it("menolak harga nol, kosong, atau bukan angka", () => {
    expect(
      menuFormSchema.safeParse({ ...baseInput, price: "0" }).success,
    ).toBe(false);
    expect(
      menuFormSchema.safeParse({ ...baseInput, price: "" }).success,
    ).toBe(false);
    expect(
      menuFormSchema.safeParse({ ...baseInput, price: "abc" }).success,
    ).toBe(false);
  });

  it("menolak nama menu terlalu pendek", () => {
    expect(
      menuFormSchema.safeParse({ ...baseInput, name: "a" }).success,
    ).toBe(false);
  });

  it("menolak tag dengan tambahan harga negatif", () => {
    expect(
      menuFormSchema.safeParse({
        ...baseInput,
        optionGroups: [
          {
            name: "Rasa",
            sortOrder: 0,
            tags: [{ name: "Coklat", priceDelta: "-1", sortOrder: 0 }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("menolak jumlah grup opsi melebihi batas", () => {
    const groups = Array.from({ length: MENU_MAX_OPTION_GROUPS + 1 }, (_, i) => ({
      name: `Grup ${i}`,
      sortOrder: i,
      tags: [],
    }));

    expect(
      menuFormSchema.safeParse({ ...baseInput, optionGroups: groups }).success,
    ).toBe(false);
  });
});
