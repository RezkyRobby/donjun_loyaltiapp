import { z } from "zod";

import { normalizeCustomerSearchQuery } from "@/lib/customer-search";

// Skema manajemen pelanggan oleh Super Admin (PRD §5.3 fitur 5): pencarian akun
// dan penangguhan (suspend). Validasi klien dipakai untuk umpan balik dan tetap
// divalidasi ulang di Server Action (AGENTS.md aturan 1).

export const CUSTOMER_ADMIN_SEARCH_MAX = 80;
export const CUSTOMER_ID_MAX = 64;

// Karakter yang diizinkan pada kata kunci: huruf (termasuk non-Latin untuk nama),
// angka, spasi, titik, garis bawah, `@` (awalan username), `+`, tanda hubung, dan
// apostrof. Wildcard SQL (`%`, `_`) tidak termasuk dan tetap di-escape sebelum
// menyentuh kueri (AGENTS.md aturan 2).
const SEARCH_PATTERN = /^[\p{L}\p{N} ._@+'-]*$/u;

// Kata kunci pencarian pelanggan (nama, username, email, atau nomor telepon).
// String kosong berarti tanpa filter — daftar menampilkan semua pelanggan.
export const customerAdminSearchSchema = z
  .string({ error: "Kata kunci pencarian tidak valid." })
  .trim()
  .max(CUSTOMER_ADMIN_SEARCH_MAX, {
    error: `Kata kunci maksimal ${CUSTOMER_ADMIN_SEARCH_MAX} karakter.`,
  })
  .regex(SEARCH_PATTERN, {
    error: "Kata kunci memuat karakter yang tidak diizinkan.",
  })
  .transform((value) => normalizeCustomerSearchQuery(value));

export type CustomerAdminSearch = z.infer<typeof customerAdminSearchSchema>;

export const customerIdSchema = z
  .string({ error: "Pelanggan tidak valid." })
  .trim()
  .min(1, { error: "Pelanggan tidak valid." })
  .max(CUSTOMER_ID_MAX, { error: "Pelanggan tidak valid." });

// Penangguhan/pengaktifan kembali akun pelanggan (PRD §5.3 fitur 5, §8.5).
export const setCustomerActiveSchema = z.object({
  id: customerIdSchema,
  isActive: z.boolean({ error: "Status akun tidak valid." }),
});

export type SetCustomerActiveInput = z.infer<typeof setCustomerActiveSchema>;
