"use client";

import Link from "next/link";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { requestPasswordResetSchema } from "@/lib/password-reset";

// Permintaan tautan reset kata sandi (PRD §5.1 fitur 3, §8.2). Respons selalu
// generik agar keberadaan email tidak dapat dienumerasi; kuota email 5/akun/hari
// ditegakkan di lapisan server.
export function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = requestPasswordResetSchema.safeParse({ email });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Email tidak valid.");
      return;
    }

    setFieldError(undefined);
    setIsSubmitting(true);

    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      // Tautan email mengarah ke halaman reset aplikasi (Better-Auth
      // menambahkan token saat mengalihkan).
      redirectTo: "/reset-sandi",
    });

    setIsSubmitting(false);

    if (error) {
      setFormError(
        "Tidak dapat memproses permintaan saat ini. Coba lagi sebentar lagi.",
      );
      return;
    }

    setIsSent(true);
  }

  if (isSent) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="success">
          Bila email tersebut terdaftar, kami telah mengirim tautan pengaturan
          ulang kata sandi. Tautan berlaku 30 menit dan hanya dapat dipakai
          sekali.
        </FormAlert>
        <p className="text-sm text-brand-brown-muted">
          Tidak menerima email? Periksa folder spam, lalu tunggu 60 detik
          sebelum meminta tautan baru.
        </p>
        <Link
          href="/masuk"
          className="text-sm font-medium text-brand-orange-deep underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      <TextField
        id="email"
        label="Email"
        type="email"
        value={email}
        onValueChange={setEmail}
        autoComplete="email"
        inputMode="email"
        hint="Masukkan email yang Anda pakai untuk mendaftar."
        error={fieldError}
      />
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Mengirim..." : "Kirim tautan reset"}
      </Button>
    </form>
  );
}
