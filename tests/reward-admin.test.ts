import { describe, expect, it } from "vitest";

import {
  normalizeRewardBenefit,
  rewardFormSchema,
  toRewardPeriod,
} from "@/lib/reward-admin";

// Input mentah seperti yang dikirim form (semua nilai berupa string).
const baseInput = {
  title: "Gratis 1 Donat Glaze",
  description: "",
  pointsCost: "5",
  quota: "",
  perUserLimit: "",
  startAt: "",
  endAt: "",
  terms: "",
  isActive: true,
  benefitType: "GENERIC",
  linkedMenuId: "",
  discountPercent: "",
  discountAmount: "",
};

describe("rewardFormSchema", () => {
  it("menerima input sah dan mengubah teks kosong menjadi null", () => {
    const parsed = rewardFormSchema.safeParse(baseInput);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.pointsCost).toBe(5);
    expect(parsed.data.description).toBeNull();
    expect(parsed.data.quota).toBeNull();
    expect(parsed.data.perUserLimit).toBeNull();
    expect(parsed.data.startAt).toBeNull();
    expect(parsed.data.endAt).toBeNull();
    expect(parsed.data.terms).toBeNull();
  });

  it("mengubah kuota dan limit berupa angka menjadi bilangan bulat", () => {
    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      quota: "25",
      perUserLimit: "2",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.quota).toBe(25);
    expect(parsed.data.perUserLimit).toBe(2);
  });

  it("menolak nama promo terlalu pendek", () => {
    const parsed = rewardFormSchema.safeParse({ ...baseInput, title: "ab" });

    expect(parsed.success).toBe(false);
  });

  it("menolak biaya poin kosong, nol, atau bukan angka", () => {
    expect(
      rewardFormSchema.safeParse({ ...baseInput, pointsCost: "" }).success,
    ).toBe(false);
    expect(
      rewardFormSchema.safeParse({ ...baseInput, pointsCost: "0" }).success,
    ).toBe(false);
    expect(
      rewardFormSchema.safeParse({ ...baseInput, pointsCost: "abc" }).success,
    ).toBe(false);
  });

  it("menolak kuota dan limit bernilai negatif atau nol", () => {
    expect(
      rewardFormSchema.safeParse({ ...baseInput, quota: "-1" }).success,
    ).toBe(false);
    expect(
      rewardFormSchema.safeParse({ ...baseInput, perUserLimit: "0" }).success,
    ).toBe(false);
  });

  it("menolak format tanggal yang tidak sesuai", () => {
    expect(
      rewardFormSchema.safeParse({ ...baseInput, startAt: "27-09-2026" })
        .success,
    ).toBe(false);
  });

  it("menolak tanggal berakhir sebelum tanggal mulai", () => {
    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      startAt: "2026-10-01",
      endAt: "2026-09-01",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(parsed.error.issues[0]?.path).toEqual(["endAt"]);
  });

  it("menerima tanggal mulai dan berakhir yang berurutan", () => {
    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      startAt: "2026-09-01",
      endAt: "2026-09-30",
    });

    expect(parsed.success).toBe(true);
  });

  it("mengosongkan kolom manfaat yang tidak relevan pada tipe GENERIC", () => {
    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      discountPercent: "50",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.benefitType).toBe("GENERIC");
    expect(parsed.data.linkedMenuId).toBeNull();
    expect(parsed.data.discountPercent).toBe(50);
  });

  it("mewajibkan menu tertaut pada tipe PRODUCT", () => {
    const missing = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "PRODUCT",
    });

    expect(missing.success).toBe(false);
    if (missing.success) return;
    expect(missing.error.issues[0]?.path).toEqual(["linkedMenuId"]);

    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "PRODUCT",
      linkedMenuId: "menu-1",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.linkedMenuId).toBe("menu-1");
  });

  it("mewajibkan persentase diskon pada tipe PERCENT_DISCOUNT", () => {
    const missing = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "PERCENT_DISCOUNT",
    });

    expect(missing.success).toBe(false);
    if (missing.success) return;
    expect(missing.error.issues[0]?.path).toEqual(["discountPercent"]);

    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "PERCENT_DISCOUNT",
      discountPercent: "25",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.discountPercent).toBe(25);
  });

  it("menolak persentase diskon di luar 1 sampai 100", () => {
    expect(
      rewardFormSchema.safeParse({
        ...baseInput,
        benefitType: "PERCENT_DISCOUNT",
        discountPercent: "0",
      }).success,
    ).toBe(false);
    expect(
      rewardFormSchema.safeParse({
        ...baseInput,
        benefitType: "PERCENT_DISCOUNT",
        discountPercent: "101",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan nominal diskon pada tipe AMOUNT_DISCOUNT", () => {
    const missing = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "AMOUNT_DISCOUNT",
    });

    expect(missing.success).toBe(false);
    if (missing.success) return;
    expect(missing.error.issues[0]?.path).toEqual(["discountAmount"]);

    const parsed = rewardFormSchema.safeParse({
      ...baseInput,
      benefitType: "AMOUNT_DISCOUNT",
      discountAmount: "10000",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.discountAmount).toBe(10_000);
  });

  it("menolak tipe manfaat yang tidak dikenal", () => {
    expect(
      rewardFormSchema.safeParse({ ...baseInput, benefitType: "BOGO" }).success,
    ).toBe(false);
  });
});

describe("normalizeRewardBenefit", () => {
  it("menyisakan hanya kolom yang relevan untuk tiap tipe", () => {
    expect(
      normalizeRewardBenefit({
        benefitType: "PRODUCT",
        linkedMenuId: "menu-1",
        discountPercent: 30,
        discountAmount: 5000,
      }),
    ).toEqual({
      benefitType: "PRODUCT",
      linkedMenuId: "menu-1",
      discountPercent: null,
      discountAmount: null,
    });

    expect(
      normalizeRewardBenefit({
        benefitType: "PERCENT_DISCOUNT",
        linkedMenuId: "menu-1",
        discountPercent: 30,
        discountAmount: 5000,
      }),
    ).toEqual({
      benefitType: "PERCENT_DISCOUNT",
      linkedMenuId: null,
      discountPercent: 30,
      discountAmount: null,
    });

    expect(
      normalizeRewardBenefit({
        benefitType: "AMOUNT_DISCOUNT",
        linkedMenuId: "menu-1",
        discountPercent: 30,
        discountAmount: 5000,
      }),
    ).toEqual({
      benefitType: "AMOUNT_DISCOUNT",
      linkedMenuId: null,
      discountPercent: null,
      discountAmount: 5000,
    });
  });

  it("menghapus semua kolom manfaat untuk tipe GENERIC", () => {
    expect(
      normalizeRewardBenefit({
        benefitType: "GENERIC",
        linkedMenuId: "menu-1",
        discountPercent: 30,
        discountAmount: 5000,
      }),
    ).toEqual({
      benefitType: "GENERIC",
      linkedMenuId: null,
      discountPercent: null,
      discountAmount: null,
    });
  });
});

describe("toRewardPeriod", () => {
  it("menerjemahkan tanggal WITA menjadi batas UTC awal dan akhir hari", () => {
    const period = toRewardPeriod({
      startAt: "2026-09-27",
      endAt: "2026-09-27",
    });

    expect(period.startAt?.toISOString()).toBe("2026-09-26T16:00:00.000Z");
    expect(period.endAt?.toISOString()).toBe("2026-09-27T15:59:59.999Z");
  });

  it("mengembalikan null bila periode tidak diisi", () => {
    expect(toRewardPeriod({ startAt: null, endAt: null })).toEqual({
      startAt: null,
      endAt: null,
    });
  });
});
