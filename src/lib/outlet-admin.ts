import { z } from "zod";

// Skema manajemen outlet (PRD §5.3 fitur 6): nama, alamat, kontak, dan status
// aktif. Validasi klien dipakai untuk umpan balik dan tetap divalidasi ulang di
// Server Action (AGENTS.md aturan 1).

export const OUTLET_NAME_MIN = 2;
export const OUTLET_NAME_MAX = 120;
export const OUTLET_ADDRESS_MIN = 5;
export const OUTLET_ADDRESS_MAX = 300;
export const OUTLET_ID_MAX = 64;

// Nomor telepon outlet bersifat opsional (PRD §7.2). Pola sama dengan nomor
// telepon pelanggan: angka dengan pemisah spasi/tanda hubung dan awalan + opsional.
const OUTLET_PHONE_PATTERN = /^[0-9+][0-9\s-]{7,17}$/;

const optionalPhoneSchema = z
  .string({ error: "Nomor telepon tidak valid." })
  .trim()
  .max(20, { error: "Nomor telepon maksimal 20 karakter." })
  .refine((value) => value === "" || OUTLET_PHONE_PATTERN.test(value), {
    error: "Nomor telepon tidak valid. Contoh: 0411-000001.",
  })
  .transform((value) => (value.length > 0 ? value : null));

export const outletFormSchema = z.object({
  name: z
    .string({ error: "Nama outlet wajib diisi." })
    .trim()
    .min(OUTLET_NAME_MIN, {
      error: `Nama outlet minimal ${OUTLET_NAME_MIN} karakter.`,
    })
    .max(OUTLET_NAME_MAX, {
      error: `Nama outlet maksimal ${OUTLET_NAME_MAX} karakter.`,
    }),
  address: z
    .string({ error: "Alamat wajib diisi." })
    .trim()
    .min(OUTLET_ADDRESS_MIN, {
      error: `Alamat minimal ${OUTLET_ADDRESS_MIN} karakter.`,
    })
    .max(OUTLET_ADDRESS_MAX, {
      error: `Alamat maksimal ${OUTLET_ADDRESS_MAX} karakter.`,
    }),
  phone: optionalPhoneSchema,
  isActive: z.boolean({ error: "Status aktif tidak valid." }),
});

export type OutletFormInput = z.infer<typeof outletFormSchema>;

export const outletIdSchema = z
  .string({ error: "Outlet tidak valid." })
  .trim()
  .min(1, { error: "Outlet tidak valid." })
  .max(OUTLET_ID_MAX, { error: "Outlet tidak valid." });
