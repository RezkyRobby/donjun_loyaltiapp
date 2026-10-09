import { z } from "zod";

// Skema manajemen menu belanja beserta grup opsi/tag (PRD §5.3 fitur 8).
// Gambar diunggah terpisah lewat Cloudinary (seperti reward) sehingga tidak
// masuk skema ini. Tag opsi bersifat opsional, multi-pilih, dan boleh menambah
// harga (`priceDelta`).

export const MENU_NAME_MIN = 2;
export const MENU_NAME_MAX = 120;
export const MENU_DESCRIPTION_MAX = 500;
export const MENU_PRICE_MIN = 1;
export const MENU_PRICE_MAX = 100_000_000;
export const MENU_SORT_MAX = 9999;
export const MENU_ID_MAX = 64;
export const MENU_OPTION_NAME_MAX = 60;
export const MENU_TAG_PRICE_DELTA_MAX = 1_000_000;
export const MENU_MAX_OPTION_GROUPS = 10;
export const MENU_MAX_TAGS_PER_GROUP = 20;

function optionalText(max: number, error: string) {
  return z
    .string({ error })
    .trim()
    .max(max, { error })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

function sortOrderSchema(error: string) {
  return z.coerce
    .number({ error })
    .int({ error })
    .min(0, { error })
    .max(MENU_SORT_MAX, { error });
}

function requiredText(min: number, max: number, label: string) {
  return z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(min, { error: `${label} minimal ${min} karakter.` })
    .max(max, { error: `${label} maksimal ${max} karakter.` });
}

const menuOptionTagFormSchema = z.object({
  name: requiredText(1, MENU_OPTION_NAME_MAX, "Nama tag"),
  priceDelta: z.coerce
    .number({ error: "Tambahan harga tidak valid." })
    .int({ error: "Tambahan harga harus bilangan bulat." })
    .min(0, { error: "Tambahan harga minimal 0." })
    .max(MENU_TAG_PRICE_DELTA_MAX, {
      error: `Tambahan harga maksimal ${MENU_TAG_PRICE_DELTA_MAX}.`,
    }),
  sortOrder: sortOrderSchema("Urutan tag tidak valid."),
});

const menuOptionGroupFormSchema = z.object({
  name: requiredText(1, MENU_OPTION_NAME_MAX, "Nama grup opsi"),
  sortOrder: sortOrderSchema("Urutan grup opsi tidak valid."),
  tags: z
    .array(menuOptionTagFormSchema, { error: "Daftar tag tidak valid." })
    .max(MENU_MAX_TAGS_PER_GROUP, {
      error: `Maksimal ${MENU_MAX_TAGS_PER_GROUP} tag per grup.`,
    })
    .default([]),
});

export type MenuOptionGroupInput = z.infer<typeof menuOptionGroupFormSchema>;

export const menuFormSchema = z.object({
  categoryId: z
    .string({ error: "Kategori menu tidak valid." })
    .trim()
    .max(MENU_ID_MAX, { error: "Kategori menu tidak valid." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  name: requiredText(MENU_NAME_MIN, MENU_NAME_MAX, "Nama menu"),
  description: optionalText(
    MENU_DESCRIPTION_MAX,
    `Deskripsi maksimal ${MENU_DESCRIPTION_MAX} karakter.`,
  ),
  price: z.coerce
    .number({ error: "Harga wajib diisi." })
    .int({ error: "Harga harus bilangan bulat." })
    .min(MENU_PRICE_MIN, { error: `Harga minimal ${MENU_PRICE_MIN}.` })
    .max(MENU_PRICE_MAX, { error: `Harga maksimal ${MENU_PRICE_MAX}.` }),
  sortOrder: sortOrderSchema("Urutan tampil tidak valid."),
  isActive: z.boolean({ error: "Status aktif tidak valid." }),
  optionGroups: z
    .array(menuOptionGroupFormSchema, { error: "Daftar grup opsi tidak valid." })
    .max(MENU_MAX_OPTION_GROUPS, {
      error: `Maksimal ${MENU_MAX_OPTION_GROUPS} grup opsi.`,
    })
    .default([]),
});

export type MenuFormInput = z.infer<typeof menuFormSchema>;

export const menuIdSchema = z
  .string({ error: "Menu tidak valid." })
  .trim()
  .min(1, { error: "Menu tidak valid." })
  .max(MENU_ID_MAX, { error: "Menu tidak valid." });
