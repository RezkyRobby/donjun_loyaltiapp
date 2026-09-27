import { z } from "zod";

import { isReservedUsername } from "@/constants/reserved-usernames";

export const USERNAME_MIN_LENGTH = 8;
export const USERNAME_MAX_LENGTH = 20;

// PRD Lampiran A.1: diawali huruf, diakhiri huruf/angka, boleh memuat huruf,
// angka, titik, dan garis bawah, panjang total 8–20 karakter.
export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{6,18}[a-z0-9]$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsernameFormat(value: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

// Skema username terpusat: dipakai klien untuk umpan balik real-time dan wajib
// divalidasi ulang di server (AGENTS.md aturan 1). Nilai keluaran sudah
// dinormalkan ke huruf kecil dan bebas reserved words.
export const usernameSchema = z
  .string({ error: "Username wajib berupa teks." })
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, {
    error: `Username minimal ${USERNAME_MIN_LENGTH} karakter.`,
  })
  .max(USERNAME_MAX_LENGTH, {
    error: `Username maksimal ${USERNAME_MAX_LENGTH} karakter.`,
  })
  .regex(USERNAME_PATTERN, {
    error:
      "Username hanya boleh berisi huruf, angka, titik, dan garis bawah; diawali huruf serta tidak diakhiri titik atau garis bawah.",
  })
  .refine((value) => !isReservedUsername(value), {
    error: "Username mengandung kata yang tidak diizinkan.",
  });
