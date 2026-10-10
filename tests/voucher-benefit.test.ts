import { describe, expect, it } from "vitest";

import { RewardBenefitType } from "@/generated/prisma/enums";
import { buildVoucherBenefitSnapshot } from "@/lib/voucher-benefit";

const menu = { id: "menu-1", name: "Donat Glaze Coklat", price: 8_000 };

describe("buildVoucherBenefitSnapshot", () => {
  it("menyalin menu tertaut beserta nama dan harga untuk tipe PRODUCT", () => {
    const snapshot = buildVoucherBenefitSnapshot(
      {
        benefitType: RewardBenefitType.PRODUCT,
        linkedMenuId: "menu-1",
        discountPercent: null,
        discountAmount: null,
      },
      menu,
    );

    expect(snapshot).toEqual({
      benefitType: RewardBenefitType.PRODUCT,
      discountPercent: null,
      discountAmount: null,
      linkedMenuId: "menu-1",
      linkedMenuName: "Donat Glaze Coklat",
      linkedMenuPrice: 8_000,
    });
  });

  it("menurunkan PRODUCT tanpa menu tertaut yang tersedia ke GENERIC", () => {
    const snapshot = buildVoucherBenefitSnapshot(
      {
        benefitType: RewardBenefitType.PRODUCT,
        linkedMenuId: "menu-hilang",
        discountPercent: null,
        discountAmount: null,
      },
      null,
    );

    expect(snapshot).toEqual({
      benefitType: RewardBenefitType.GENERIC,
      discountPercent: null,
      discountAmount: null,
      linkedMenuId: null,
      linkedMenuName: null,
      linkedMenuPrice: null,
    });
  });

  it("menyalin persentase diskon tanpa kolom lain untuk tipe PERCENT_DISCOUNT", () => {
    const snapshot = buildVoucherBenefitSnapshot(
      {
        benefitType: RewardBenefitType.PERCENT_DISCOUNT,
        linkedMenuId: null,
        discountPercent: 25,
        discountAmount: null,
      },
      menu,
    );

    expect(snapshot).toEqual({
      benefitType: RewardBenefitType.PERCENT_DISCOUNT,
      discountPercent: 25,
      discountAmount: null,
      linkedMenuId: null,
      linkedMenuName: null,
      linkedMenuPrice: null,
    });
  });

  it("menyalin nominal diskon tanpa kolom lain untuk tipe AMOUNT_DISCOUNT", () => {
    const snapshot = buildVoucherBenefitSnapshot(
      {
        benefitType: RewardBenefitType.AMOUNT_DISCOUNT,
        linkedMenuId: null,
        discountPercent: null,
        discountAmount: 5_000,
      },
      null,
    );

    expect(snapshot).toEqual({
      benefitType: RewardBenefitType.AMOUNT_DISCOUNT,
      discountPercent: null,
      discountAmount: 5_000,
      linkedMenuId: null,
      linkedMenuName: null,
      linkedMenuPrice: null,
    });
  });

  it("menghapus seluruh kolom manfaat untuk tipe GENERIC", () => {
    const snapshot = buildVoucherBenefitSnapshot(
      {
        benefitType: RewardBenefitType.GENERIC,
        linkedMenuId: "menu-1",
        discountPercent: 30,
        discountAmount: 5_000,
      },
      menu,
    );

    expect(snapshot).toEqual({
      benefitType: RewardBenefitType.GENERIC,
      discountPercent: null,
      discountAmount: null,
      linkedMenuId: null,
      linkedMenuName: null,
      linkedMenuPrice: null,
    });
  });
});
