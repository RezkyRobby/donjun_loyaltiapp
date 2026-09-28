import { z } from "zod";

// Pencarian username kasir (PRD §5.2 fitur 2): pencocokan awalan minimal 3
// karakter, tidak membedakan huruf besar/kecil. Pencarian hanya mengembalikan
// nama dan username (PRD §10).
export const CUSTOMER_SEARCH_MIN_LENGTH = 3;
export const CUSTOMER_SEARCH_MAX_LENGTH = 20;
export const CUSTOMER_SEARCH_LIMIT = 8;

// Karakter yang sama dengan charset username (PRD Lampiran A.1).
const CUSTOMER_SEARCH_PATTERN = /^[a-z0-9._]+$/;

export function normalizeCustomerSearchQuery(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

// Skema dijalankan setelah normalisasi: dipakai klien untuk umpan balik dan
// wajib divalidasi ulang di Server Action (AGENTS.md aturan 1).
export const customerSearchQuerySchema = z
  .string({ error: "Kata kunci pencarian tidak valid." })
  .min(CUSTOMER_SEARCH_MIN_LENGTH, {
    error: `Ketik minimal ${CUSTOMER_SEARCH_MIN_LENGTH} karakter.`,
  })
  .max(CUSTOMER_SEARCH_MAX_LENGTH, {
    error: `Maksimal ${CUSTOMER_SEARCH_MAX_LENGTH} karakter.`,
  })
  .regex(CUSTOMER_SEARCH_PATTERN, {
    error: "Hanya huruf, angka, titik, atau garis bawah.",
  });

// Meloloskan karakter wildcard SQL (`%`, `_`) dan backslash agar input kasir
// tidak berubah menjadi pola pencarian yang lebih luas (AGENTS.md aturan 2).
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
