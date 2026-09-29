import { z } from "zod";

import { emailSchema, nameSchema } from "@/lib/registration";

// Skema manajemen akun staf (PRD §5.3 fitur 4, §8.6). Akun kasir hanya dibuat
// oleh Super Admin — tidak ada pendaftaran mandiri; role selalu CASHIER. Validasi
// klien dipakai untuk umpan balik dan tetap divalidasi ulang di Server Action
// (AGENTS.md aturan 1).

// Masa berlaku tautan undangan aktivasi. Dipilih 7 hari agar kasir sempat
// mengaktifkan akun; Super Admin dapat mengirim ulang bila kedaluwarsa
// (PRD §8.6 edge case).
export const STAFF_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Tautan reset kredensial oleh admin memakai masa berlaku yang sama dengan reset
// kata sandi mandiri (PRD §9: 30 menit).
export const STAFF_RESET_TTL_MS = 30 * 60 * 1000;

export const STAFF_ID_MAX = 64;

export const staffIdSchema = z
  .string({ error: "Staf tidak valid." })
  .trim()
  .min(1, { error: "Staf tidak valid." })
  .max(STAFF_ID_MAX, { error: "Staf tidak valid." });

export const outletIdSchema = z
  .string({ error: "Outlet wajib dipilih." })
  .trim()
  .min(1, { error: "Outlet wajib dipilih." })
  .max(STAFF_ID_MAX, { error: "Outlet tidak valid." });

export const staffCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  outletId: outletIdSchema,
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffOutletSchema = z.object({
  outletId: outletIdSchema,
});

export type StaffOutletInput = z.infer<typeof staffOutletSchema>;

// Tautan aktivasi mengarah ke halaman pembuatan kata sandi aplikasi dengan token
// sekali pakai. Halaman membaca `?token=` lalu memanggil Better-Auth
// `resetPassword`, yang mencocokkan token pada penyimpanan internalnya.
export function buildStaffActivationUrl(
  baseUrl: string,
  token: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");

  return `${base}/reset-sandi?token=${encodeURIComponent(token)}`;
}
