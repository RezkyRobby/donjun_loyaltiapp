import type { RewardUnavailableReason } from "@/lib/reward-availability";

// Kamus label terpusat (AGENTS.md: label status/istilah UI lewat satu kamus di
// src/constants, jangan hardcode string per komponen). Semua teks Bahasa
// Indonesia formal.
export const REWARD_UNAVAILABLE_REASON_LABELS: Record<
  RewardUnavailableReason,
  string
> = {
  INACTIVE: "Promo sedang tidak aktif",
  OUT_OF_PERIOD: "Di luar periode promo",
  QUOTA_EXHAUSTED: "Kuota promo sudah habis",
  USER_LIMIT_REACHED: "Batas klaim Anda sudah tercapai",
  INSUFFICIENT_POINTS: "Poin Anda belum mencukupi",
};
