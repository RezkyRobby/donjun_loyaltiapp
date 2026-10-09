import { z } from "zod";

// Skema manajemen kategori menu (PRD §5.3 fitur 7): nama, urutan tampil, dan
// status aktif. Validasi klien dipakai untuk umpan balik dan tetap divalidasi
// ulang di Server Action (AGENTS.md aturan 1).

export const MENU_CATEGORY_NAME_MIN = 2;
export const MENU_CATEGORY_NAME_MAX = 80;
export const MENU_CATEGORY_SORT_MAX = 9999;
export const MENU_CATEGORY_ID_MAX = 64;

export const menuCategoryFormSchema = z.object({
  name: z
    .string({ error: "Nama kategori wajib diisi." })
    .trim()
    .min(MENU_CATEGORY_NAME_MIN, {
      error: `Nama kategori minimal ${MENU_CATEGORY_NAME_MIN} karakter.`,
    })
    .max(MENU_CATEGORY_NAME_MAX, {
      error: `Nama kategori maksimal ${MENU_CATEGORY_NAME_MAX} karakter.`,
    }),
  sortOrder: z.coerce
    .number({ error: "Urutan tampil tidak valid." })
    .int({ error: "Urutan tampil harus bilangan bulat." })
    .min(0, { error: "Urutan tampil minimal 0." })
    .max(MENU_CATEGORY_SORT_MAX, {
      error: `Urutan tampil maksimal ${MENU_CATEGORY_SORT_MAX}.`,
    }),
  isActive: z.boolean({ error: "Status aktif tidak valid." }),
});

export type MenuCategoryFormInput = z.infer<typeof menuCategoryFormSchema>;

export const menuCategoryIdSchema = z
  .string({ error: "Kategori menu tidak valid." })
  .trim()
  .min(1, { error: "Kategori menu tidak valid." })
  .max(MENU_CATEGORY_ID_MAX, { error: "Kategori menu tidak valid." });
