import { describe, expect, it } from "vitest";

import { rewardFormSchema, toRewardPeriod } from "@/lib/reward-admin";

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
