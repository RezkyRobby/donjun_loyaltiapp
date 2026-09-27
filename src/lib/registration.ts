import { z } from "zod";

import { usernameSchema } from "@/lib/username";

// Skema Zod registrasi pelanggan (PRD §5.1 fitur 1–2, Lampiran A). Dipakai di
// klien untuk umpan balik langsung dan wajib divalidasi ulang di Server Action
// (AGENTS.md aturan 1).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;

// Nomor telepon opsional (PRD §7.1): angka dengan pemisah spasi atau tanda
// hubung dan awalan + opsional. Normalisasi sebelum disimpan.
const PHONE_PATTERN = /^[0-9+][0-9\s-]{7,17}$/;

export const nameSchema = z
  .string({ error: "Nama wajib diisi." })
  .trim()
  .min(NAME_MIN_LENGTH, {
    error: `Nama minimal ${NAME_MIN_LENGTH} karakter.`,
  })
  .max(NAME_MAX_LENGTH, {
    error: `Nama maksimal ${NAME_MAX_LENGTH} karakter.`,
  });

export const emailSchema = z
  .string({ error: "Email wajib diisi." })
  .trim()
  .min(1, { error: "Email wajib diisi." })
  .toLowerCase()
  .refine((value) => z.email().safeParse(value).success, {
    error: "Format email tidak valid.",
  });

export const passwordSchema = z
  .string({ error: "Kata sandi wajib diisi." })
  .min(PASSWORD_MIN_LENGTH, {
    error: `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    error: `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`,
  });

export const phoneSchema = z
  .string({ error: "Nomor telepon wajib berupa teks." })
  .trim()
  .refine((value) => value === "" || PHONE_PATTERN.test(value), {
    error: "Nomor telepon tidak valid. Contoh: 081234567890.",
  })
  .optional();

export const registrationSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema,
  phone: phoneSchema,
  password: passwordSchema,
  // PRD §10: persetujuan Kebijakan Privasi & Syarat dan Ketentuan wajib.
  consent: z.literal(true, {
    error:
      "Anda harus menyetujui Kebijakan Privasi dan Syarat dan Ketentuan untuk mendaftar.",
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Skema form registrasi menambahkan konfirmasi kata sandi (hanya di klien).
export const registrationFormSchema = registrationSchema
  .extend({
    confirmPassword: z.string({ error: "Konfirmasi kata sandi wajib diisi." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Konfirmasi kata sandi tidak cocok.",
  });

export type RegistrationFormInput = z.infer<typeof registrationFormSchema>;

export const completeUsernameSchema = z.object({
  username: usernameSchema,
});

export type CompleteUsernameInput = z.infer<typeof completeUsernameSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Kata sandi wajib diisi." })
    .min(1, { error: "Kata sandi wajib diisi." }),
});

export type SignInInput = z.infer<typeof signInSchema>;

export function normalizePhone(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+62")) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith("62")) return `0${cleaned.slice(2)}`;

  return cleaned;
}

// Meratakan isu Zod menjadi peta galat per-field agar dapat ditampilkan di
// samping input terkait (design.md §8 & §11).
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const [key] = issue.path;

    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
