import { describe, expect, it } from "vitest";

import {
  getRemainingQuota,
  getRewardAvailability,
  isWithinActivePeriod,
  type RewardAvailabilityInput,
} from "@/lib/reward-availability";

const NOW = new Date("2026-10-15T04:00:00.000Z");

// Basis input yang seluruh syaratnya terpenuhi; tiap test menimpa satu field.
const BASE: RewardAvailabilityInput = {
  isActive: true,
  pointsCost: 5,
  quota: 100,
  perUserLimit: 3,
  startAt: null,
  endAt: null,
  pointsBalance: 10,
  claimedCount: 10,
  claimedByUserCount: 0,
  now: NOW,
};

function input(overrides: Partial<RewardAvailabilityInput>) {
  return { ...BASE, ...overrides };
}

describe("isWithinActivePeriod", () => {
  it("menerima periode terbuka tanpa batas", () => {
    expect(isWithinActivePeriod(null, null, NOW)).toBe(true);
  });

  it("menerima tepat pada batas mulai dan berakhir (inklusif)", () => {
    expect(isWithinActivePeriod(NOW, null, NOW)).toBe(true);
    expect(isWithinActivePeriod(null, NOW, NOW)).toBe(true);
  });

  it("menolak sebelum periode mulai", () => {
    const start = new Date(NOW.getTime() + 60_000);
    expect(isWithinActivePeriod(start, null, NOW)).toBe(false);
  });

  it("menolak setelah periode berakhir", () => {
    const end = new Date(NOW.getTime() - 60_000);
    expect(isWithinActivePeriod(null, end, NOW)).toBe(false);
  });
});

describe("getRemainingQuota", () => {
  it("null berarti tidak terbatas", () => {
    expect(getRemainingQuota(null, 999)).toBeNull();
  });

  it("mengurangi kuota dengan jumlah voucher terbit", () => {
    expect(getRemainingQuota(100, 42)).toBe(58);
  });

  it("tidak pernah negatif meski terbit melebihi kuota", () => {
    expect(getRemainingQuota(5, 9)).toBe(0);
  });
});

describe("getRewardAvailability", () => {
  it("dapat ditukar saat seluruh syarat terpenuhi", () => {
    const result = getRewardAvailability(input({}));

    expect(result.canRedeem).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.remainingQuota).toBe(90);
  });

  it("menandai promo tidak aktif", () => {
    expect(getRewardAvailability(input({ isActive: false })).reason).toBe(
      "INACTIVE",
    );
  });

  it("menandai di luar periode promo", () => {
    const end = new Date(NOW.getTime() - 60_000);

    expect(getRewardAvailability(input({ endAt: end })).reason).toBe(
      "OUT_OF_PERIOD",
    );
  });

  it("menandai kuota habis", () => {
    expect(
      getRewardAvailability(input({ quota: 10, claimedCount: 10 })).reason,
    ).toBe("QUOTA_EXHAUSTED");
  });

  it("menandai batas klaim per pelanggan tercapai", () => {
    expect(
      getRewardAvailability(input({ perUserLimit: 2, claimedByUserCount: 2 }))
        .reason,
    ).toBe("USER_LIMIT_REACHED");
  });

  it("menandai poin belum mencukupi", () => {
    expect(
      getRewardAvailability(input({ pointsCost: 20, pointsBalance: 10 })).reason,
    ).toBe("INSUFFICIENT_POINTS");
  });

  it("memprioritaskan alasan sesuai urutan pemeriksaan", () => {
    const result = getRewardAvailability(
      input({
        isActive: false,
        endAt: new Date(NOW.getTime() - 60_000),
        quota: 1,
        claimedCount: 1,
        perUserLimit: 1,
        claimedByUserCount: 1,
        pointsCost: 99,
        pointsBalance: 0,
      }),
    );

    expect(result.reason).toBe("INACTIVE");
  });

  it("mengabaikan batas klaim saat tidak terbatas (null)", () => {
    const result = getRewardAvailability(
      input({ perUserLimit: null, claimedByUserCount: 50 }),
    );

    expect(result.canRedeem).toBe(true);
  });

  it("mengabaikan kuota saat tidak terbatas (null)", () => {
    const result = getRewardAvailability(
      input({ quota: null, claimedCount: 50 }),
    );

    expect(result.remainingQuota).toBeNull();
    expect(result.canRedeem).toBe(true);
  });
});
