// Kelayakan penukaran reward (PRD §5.1 fitur 5, §8.4). Fungsi murni tanpa
// akses database agar dapat diuji unit dan dipakai ulang di dalam transaksi
// penukaran (Task 14). Voucher berstatus CANCELED tidak ikut dihitung: poinnya
// sudah dikembalikan sebagai REVERSAL, sehingga kuota dan limit pelanggan
// kembali tersedia (PRD §8.5).

export type RewardUnavailableReason =
  | "INACTIVE"
  | "OUT_OF_PERIOD"
  | "QUOTA_EXHAUSTED"
  | "USER_LIMIT_REACHED"
  | "INSUFFICIENT_POINTS";

export type RewardAvailabilityInput = {
  isActive: boolean;
  pointsCost: number;
  quota: number | null;
  perUserLimit: number | null;
  startAt: Date | null;
  endAt: Date | null;
  pointsBalance: number;
  claimedCount: number;
  claimedByUserCount: number;
  now: Date;
};

export type RewardAvailability = {
  remainingQuota: number | null;
  canRedeem: boolean;
  reason: RewardUnavailableReason | null;
};

// Periode aktif inklusif pada kedua ujung (startAt dan endAt boleh null).
export function isWithinActivePeriod(
  startAt: Date | null,
  endAt: Date | null,
  now: Date,
): boolean {
  if (startAt && now.getTime() < startAt.getTime()) return false;
  if (endAt && now.getTime() > endAt.getTime()) return false;

  return true;
}

// Sisa kuota promo; null berarti tidak terbatas. Tidak pernah negatif meski
// jumlah voucher terbit melebihi kuota.
export function getRemainingQuota(
  quota: number | null,
  claimedCount: number,
): number | null {
  if (quota === null) return null;

  return Math.max(quota - claimedCount, 0);
}

function getUnavailableReason(
  input: RewardAvailabilityInput,
  remainingQuota: number | null,
): RewardUnavailableReason | null {
  if (!input.isActive) return "INACTIVE";
  if (!isWithinActivePeriod(input.startAt, input.endAt, input.now)) {
    return "OUT_OF_PERIOD";
  }
  if (remainingQuota !== null && remainingQuota <= 0) return "QUOTA_EXHAUSTED";
  if (
    input.perUserLimit !== null &&
    input.claimedByUserCount >= input.perUserLimit
  ) {
    return "USER_LIMIT_REACHED";
  }
  if (input.pointsBalance < input.pointsCost) return "INSUFFICIENT_POINTS";

  return null;
}

export function getRewardAvailability(
  input: RewardAvailabilityInput,
): RewardAvailability {
  const remainingQuota = getRemainingQuota(input.quota, input.claimedCount);
  const reason = getUnavailableReason(input, remainingQuota);

  return {
    remainingQuota,
    canRedeem: reason === null,
    reason,
  };
}
