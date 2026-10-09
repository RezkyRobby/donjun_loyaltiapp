import { describe, expect, it } from "vitest";

import {
  calculateShopTotals,
  getLineTotal,
  getLineUnitPrice,
  getVoucherDiscount,
  type ShopPricedItem,
  type VoucherBenefitSnapshot,
} from "@/lib/shop-pricing";

const donat: ShopPricedItem = {
  menuId: "menu-1",
  menuName: "Donat Glaze",
  unitPrice: 8_000,
  quantity: 12,
  note: null,
  options: [
    { tagId: "tag-1", name: "Coklat", priceDelta: 1_000 },
    { tagId: "tag-2", name: "Keju", priceDelta: 2_000 },
  ],
};

const kopi: ShopPricedItem = {
  menuId: "menu-2",
  menuName: "Kopi Susu",
  unitPrice: 15_000,
  quantity: 2,
  note: "Tanpa gula",
  options: [],
};

function voucher(
  overrides: Partial<VoucherBenefitSnapshot>,
): VoucherBenefitSnapshot {
  return {
    benefitType: "GENERIC",
    discountPercent: null,
    discountAmount: null,
    linkedMenuId: null,
    linkedMenuName: null,
    linkedMenuPrice: null,
    ...overrides,
  };
}

describe("getLineUnitPrice", () => {
  it("menambahkan seluruh priceDelta tag opsi", () => {
    expect(getLineUnitPrice(donat)).toBe(11_000);
    expect(getLineUnitPrice(kopi)).toBe(15_000);
  });
});

describe("getLineTotal", () => {
  it("mengalikan harga satuan dengan jumlah", () => {
    expect(getLineTotal(donat)).toBe(132_000);
  });

  it("selalu nol untuk baris gratis", () => {
    expect(getLineTotal(donat, true)).toBe(0);
  });
});

describe("getVoucherDiscount", () => {
  it("tanpa voucher tidak ada potongan", () => {
    expect(getVoucherDiscount(100_000, null)).toBe(0);
  });

  it("GENERIC tidak mengubah total", () => {
    expect(getVoucherDiscount(100_000, voucher({ benefitType: "GENERIC" }))).toBe(
      0,
    );
  });

  it("PERCENT_DISCOUNT dibulatkan ke bawah ke rupiah utuh", () => {
    expect(
      getVoucherDiscount(
        9_999,
        voucher({ benefitType: "PERCENT_DISCOUNT", discountPercent: 10 }),
      ),
    ).toBe(999);
    expect(
      getVoucherDiscount(
        100_000,
        voucher({ benefitType: "PERCENT_DISCOUNT", discountPercent: 25 }),
      ),
    ).toBe(25_000);
  });

  it("AMOUNT_DISCOUNT dibatasi agar tidak melebihi subtotal", () => {
    expect(
      getVoucherDiscount(
        30_000,
        voucher({ benefitType: "AMOUNT_DISCOUNT", discountAmount: 5_000 }),
      ),
    ).toBe(5_000);
    expect(
      getVoucherDiscount(
        30_000,
        voucher({ benefitType: "AMOUNT_DISCOUNT", discountAmount: 50_000 }),
      ),
    ).toBe(30_000);
  });
});

describe("calculateShopTotals", () => {
  it("menghitung subtotal dan total tanpa voucher", () => {
    const totals = calculateShopTotals([donat, kopi]);

    expect(totals.subtotal).toBe(162_000);
    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(162_000);
    expect(totals.lines).toHaveLength(2);
    expect(totals.lines.every((line) => !line.isFree)).toBe(true);
  });

  it("menambahkan 1 baris gratis untuk voucher PRODUCT", () => {
    const totals = calculateShopTotals(
      [kopi],
      voucher({
        benefitType: "PRODUCT",
        linkedMenuId: "menu-1",
        linkedMenuName: "Donat Glaze",
        linkedMenuPrice: 8_000,
      }),
    );

    expect(totals.lines).toHaveLength(2);
    const freeLine = totals.lines[1];

    expect(freeLine).toMatchObject({
      menuId: "menu-1",
      menuName: "Donat Glaze",
      unitPrice: 8_000,
      quantity: 1,
      isFree: true,
      lineTotal: 0,
    });
    expect(totals.subtotal).toBe(30_000);
    expect(totals.total).toBe(30_000);
  });

  it("tidak menambah baris gratis bila PRODUCT tanpa menu tertaut", () => {
    const totals = calculateShopTotals(
      [kopi],
      voucher({ benefitType: "PRODUCT", linkedMenuId: null }),
    );

    expect(totals.lines).toHaveLength(1);
    expect(totals.total).toBe(30_000);
  });

  it("menerapkan potongan persen pada subtotal", () => {
    const totals = calculateShopTotals(
      [kopi],
      voucher({ benefitType: "PERCENT_DISCOUNT", discountPercent: 10 }),
    );

    expect(totals.subtotal).toBe(30_000);
    expect(totals.discountAmount).toBe(3_000);
    expect(totals.total).toBe(27_000);
  });

  it("total tidak pernah negatif meski potongan melebihi subtotal", () => {
    const totals = calculateShopTotals(
      [kopi],
      voucher({ benefitType: "AMOUNT_DISCOUNT", discountAmount: 999_999 }),
    );

    expect(totals.discountAmount).toBe(30_000);
    expect(totals.total).toBe(0);
  });
});
