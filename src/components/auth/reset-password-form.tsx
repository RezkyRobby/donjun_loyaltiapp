"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { resetPasswordFormSchema } from "@/lib/password-reset";
import { toFieldErrors } from "@/lib/registration";

type ResetError = {
  code?: string;
  status?: number;
};

// Penyimpanan kata sandi baru memakai token sekali pakai dari email. Server
// Better-Auth mencabut seluruh sesi setelah kata sandi tersimpan
// (revokeSessionsOnPasswordReset, PRD §5.1 fitur 3 & §8.2).
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const parsed = resetPasswordFormSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token,
    });

    if (error) {
      setIsSubmitting(false);

      const resetError = error as ResetError;
      setFormMessage(
        resetError.code === "INVALID_TOKEN" || resetError.status === 400
          ? "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru."
          : "Gagal menyimpan kata sandi baru. Coba lagi sebentar lagi.",
      );
      return;
    }

    router.replace("/masuk?reset=sukses");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formMessage ? (
        <div className="flex flex-col gap-2">
          <FormAlert tone="error">{formMessage}</FormAlert>
          {formMessage.includes("kedaluwarsa") ? (
            <Link
              href="/lupa-sandi"
              className="text-sm font-medium text-brand-orange-deep underline"
            >
              Minta tautan baru
            </Link>
          ) : null}
        </div>
      ) : null}

      <TextField
        id="password"
        label="Kata sandi baru"
        type="password"
        value={password}
        onValueChange={setPassword}
        autoComplete="new-password"
        hint="Minimal 8 karakter."
        error={fieldErrors.password}
      />
      <TextField
        id="confirmPassword"
        label="Konfirmasi kata sandi baru"
        type="password"
        value={confirmPassword}
        onValueChange={setConfirmPassword}
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Menyimpan..." : "Simpan kata sandi baru"}
      </Button>
    </form>
  );
}
