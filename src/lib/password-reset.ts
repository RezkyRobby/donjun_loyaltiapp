import { z } from "zod";

import { emailSchema, passwordSchema } from "@/lib/registration";

// Skema pemulihan kata sandi (PRD §5.1 fitur 3, §8.2). Dipakai di klien untuk
// umpan balik langsung; validasi format sesungguhnya dilakukan Better-Auth di
// server dengan aturan yang sama (minimal 8 karakter).
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: "Konfirmasi kata sandi wajib diisi." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Konfirmasi kata sandi tidak cocok.",
  });

export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
