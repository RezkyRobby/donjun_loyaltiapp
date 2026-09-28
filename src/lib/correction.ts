import { z } from "zod";

import { USERNAME_PATTERN, normalizeUsername } from "@/lib/username";
import { voucherCodeSchema } from "@/lib/voucher-code";

// Koreksi & pembatalan admin (PRD §8.5). Alasan wajib disertakan agar setiap
// pembatalan/revert terekam pada AuditLog; koreksi saldo (`ADJUST`) wajib
// disertai catatan. Validasi klien dipakai untuk umpan balik, dan tetap
// divalidasi ulang di Server Action (AGENTS.md aturan 1).

// Jendela koreksi validasi `USED` → `ACTIVE` (PRD §8.5 langkah 3).
export const VOUCHER_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 500;
export const ADJUST_NOTE_MIN_LENGTH = 5;
export const ADJUST_NOTE_MAX_LENGTH = 500;

// Batas koreksi saldo manual per aksi untuk mencegah salah ketik ekstrem.
export const MAX_ADJUST_AMOUNT = 100_000;

export const correctionReasonSchema = z
  .string({ error: "Alasan wajib diisi." })
  .trim()
  .min(REASON_MIN_LENGTH, {
    error: `Alasan minimal ${REASON_MIN_LENGTH} karakter.`,
  })
  .max(REASON_MAX_LENGTH, {
    error: `Alasan maksimal ${REASON_MAX_LENGTH} karakter.`,
  });

// Pembatalan voucher `ACTIVE` dan revert voucher `USED` memakai bentuk input
// yang sama: kode voucher + alasan wajib.
export const voucherCorrectionSchema = z.object({
  voucherCode: voucherCodeSchema,
  reason: correctionReasonSchema,
});

export type VoucherCorrectionInput = z.infer<typeof voucherCorrectionSchema>;

// Koreksi saldo manual: username pelanggan, jumlah bertanda, dan catatan wajib
// (PRD §7.4 — `note` wajib untuk transaksi ADJUST).
export const adjustPointsSchema = z.object({
  username: z
    .string({ error: "Username pelanggan tidak valid." })
    .transform((value) => normalizeUsername(value))
    .pipe(
      z.string({ error: "Username pelanggan tidak valid." }).regex(USERNAME_PATTERN, {
        error: "Username pelanggan tidak valid.",
      }),
    ),
  amount: z.coerce
    .number({ error: "Jumlah poin tidak valid." })
    .int({ error: "Jumlah poin harus bilangan bulat." })
    .refine((value) => value !== 0, {
      error: "Jumlah poin tidak boleh nol.",
    })
    .refine((value) => Math.abs(value) <= MAX_ADJUST_AMOUNT, {
      error: `Jumlah poin maksimal ${MAX_ADJUST_AMOUNT}.`,
    }),
  note: z
    .string({ error: "Catatan koreksi wajib diisi." })
    .trim()
    .min(ADJUST_NOTE_MIN_LENGTH, {
      error: `Catatan minimal ${ADJUST_NOTE_MIN_LENGTH} karakter.`,
    })
    .max(ADJUST_NOTE_MAX_LENGTH, {
      error: `Catatan maksimal ${ADJUST_NOTE_MAX_LENGTH} karakter.`,
    }),
});

export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;

// Sisa waktu jendela koreksi dalam milidetik; nilai negatif berarti sudah
// kedaluwarsa. Batas tepat 24 jam masih dianggap berlaku (inklusif).
export function getRevertWindowRemainingMs(
  usedAt: Date,
  now: Date,
  windowMs = VOUCHER_REVERT_WINDOW_MS,
): number {
  return windowMs - (now.getTime() - usedAt.getTime());
}

export function isWithinRevertWindow(
  usedAt: Date,
  now: Date,
  windowMs = VOUCHER_REVERT_WINDOW_MS,
): boolean {
  return getRevertWindowRemainingMs(usedAt, now, windowMs) >= 0;
}

// Koreksi negatif tidak boleh membuat saldo di bawah nol (PRD §8.5 edge case).
// Nilai ini menjadi pemeriksaan awal; pembaruan kondisional di database tetap
// menjadi penjamin akhir saat permintaan bersamaan.
export function isAdjustmentAllowed(
  pointsBalance: number,
  amount: number,
): boolean {
  return pointsBalance + amount >= 0;
}
