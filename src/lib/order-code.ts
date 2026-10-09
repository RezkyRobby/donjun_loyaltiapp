import { z } from "zod";

import { SAFE_CODE_ALPHABET, generateCodeSuffix } from "@/lib/code-alphabet";

// Kode pesanan (PRD §7.6 & AGENTS.md aturan 8): "ORD-" + 10 karakter dari
// alfabet non-ambigu tanpa 0/O/1/I/L agar aman dibaca & diinput manual.
export const ORDER_PREFIX = "ORD-";
export const ORDER_ALPHABET = SAFE_CODE_ALPHABET;
export const ORDER_RANDOM_LENGTH = 10;

export const ORDER_CODE_PATTERN = new RegExp(
  `^${ORDER_PREFIX}[${ORDER_ALPHABET}]{${ORDER_RANDOM_LENGTH}}$`,
);

const DEFAULT_MAX_ATTEMPTS = 5;

export function normalizeOrderCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isOrderCode(value: string): boolean {
  return ORDER_CODE_PATTERN.test(normalizeOrderCode(value));
}

// Satu generator kode pesanan.
export function generateOrderCode(): string {
  return `${ORDER_PREFIX}${generateCodeSuffix(ORDER_RANDOM_LENGTH)}`;
}

// Menangani tabrakan unique constraint dengan mencoba ulang (AGENTS.md aturan
// 8). Pengecekan diserahkan lewat predicate agar dapat diuji tanpa database.
export async function generateUniqueOrderCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  options: { maxAttempts?: number } = {},
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateOrderCode();

    if (!(await isCodeTaken(code))) return code;
  }

  throw new Error(
    `Gagal membuat kode pesanan unik setelah ${maxAttempts} percobaan.`,
  );
}

// Skema input kode pesanan: konversi ke huruf besar lalu validasi format.
export const orderCodeSchema = z
  .string({ error: "Kode pesanan wajib berupa teks." })
  .trim()
  .toUpperCase()
  .regex(ORDER_CODE_PATTERN, { error: "Kode pesanan tidak valid." });
