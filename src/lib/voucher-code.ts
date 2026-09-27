import { z } from "zod";

// Kode voucher (PRD §7.3 & AGENTS.md aturan 8): "DJN-" + 16 karakter dari
// alfabet non-ambigu tanpa 0/O/1/I/L agar aman diinput manual.
export const VOUCHER_PREFIX = "DJN-";
export const VOUCHER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const VOUCHER_RANDOM_LENGTH = 16;

export const VOUCHER_CODE_PATTERN = new RegExp(
  `^${VOUCHER_PREFIX}[${VOUCHER_ALPHABET}]{${VOUCHER_RANDOM_LENGTH}}$`,
);

const DEFAULT_MAX_ATTEMPTS = 5;

// Byte dengan nilai >= 248 dibuang agar pemetaan ke alfabet tidak bias
// (256 bukan kelipatan 31).
const MAX_UNBIASED_BYTE = 256 - (256 % VOUCHER_ALPHABET.length);

export function normalizeVoucherCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isVoucherCode(value: string): boolean {
  return VOUCHER_CODE_PATTERN.test(normalizeVoucherCode(value));
}

// Satu generator kode voucher. Memakai Web Crypto yang tersedia di runtime Node
// maupun peramban sehingga entropi tinggi dan kode tidak dapat diprediksi.
export function generateVoucherCode(): string {
  let random = "";

  while (random.length < VOUCHER_RANDOM_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(VOUCHER_RANDOM_LENGTH));

    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED_BYTE) continue;

      random += VOUCHER_ALPHABET[byte % VOUCHER_ALPHABET.length];

      if (random.length === VOUCHER_RANDOM_LENGTH) break;
    }
  }

  return `${VOUCHER_PREFIX}${random}`;
}

// Menangani tabrakan unique constraint dengan mencoba ulang (AGENTS.md aturan
// 8). Pengecekan diserahkan lewat predicate agar tetap memakai satu generator
// dan dapat diuji tanpa database.
export async function generateUniqueVoucherCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  options: { maxAttempts?: number } = {},
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateVoucherCode();

    if (!(await isCodeTaken(code))) return code;
  }

  throw new Error(
    `Gagal membuat kode voucher unik setelah ${maxAttempts} percobaan.`,
  );
}

// Skema input kode voucher (scan/manual): konversi ke huruf besar lalu validasi
// format (AGENTS.md aturan 8, PRD §5.2 fitur 5).
export const voucherCodeSchema = z
  .string({ error: "Kode voucher wajib berupa teks." })
  .trim()
  .toUpperCase()
  .regex(VOUCHER_CODE_PATTERN, { error: "Kode voucher tidak valid." });
