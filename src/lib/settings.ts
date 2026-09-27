import { z } from "zod";

import { nameSchema, passwordSchema, phoneSchema } from "@/lib/registration";

// Skema pengaturan akun pelanggan (PRD §5.1 fitur 7). Username dan email
// bersifat permanen sehingga tidak ada di sini; hanya nama, nomor telepon, dan
// kata sandi yang dapat diubah. Validasi klien dipakai untuk umpan balik, dan
// tetap divalidasi ulang di Server Action (AGENTS.md aturan 1).
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Kata sandi saat ini wajib diisi." })
    .min(1, { error: "Kata sandi saat ini wajib diisi." }),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Form menambahkan konfirmasi kata sandi (hanya di klien).
export const changePasswordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z
      .string({ error: "Konfirmasi kata sandi wajib diisi." })
      .min(1, { error: "Konfirmasi kata sandi wajib diisi." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Konfirmasi kata sandi tidak cocok.",
  });

export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;
