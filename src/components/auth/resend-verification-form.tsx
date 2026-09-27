"use client";

import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { emailSchema } from "@/lib/registration";

// Kirim ulang tautan verifikasi (PRD §8.1). Tunduk pada kuota 5 email per akun
// per hari di sisi server; kesalahan kuota ditampilkan sebagai pesan ramah.
export function ResendVerificationForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = emailSchema.safeParse(email);

    if (!parsed.success) {
      setStatus({
        tone: "error",
        message: "Masukkan alamat email yang valid.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await authClient.sendVerificationEmail({
      email: parsed.data,
      callbackURL: "/verifikasi-email",
    });

    setIsSubmitting(false);

    if (error) {
      setStatus({
        tone: "error",
        message:
          error.status === 429
            ? "Terlalu banyak permintaan email untuk akun ini. Silakan coba lagi beberapa saat lagi."
            : "Gagal mengirim ulang email verifikasi. Coba lagi sebentar lagi.",
      });
      return;
    }

    setStatus({
      tone: "success",
      message:
        "Tautan verifikasi telah dikirim ulang. Periksa kotak masuk dan folder spam Anda.",
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {status ? (
        <FormAlert tone={status.tone}>{status.message}</FormAlert>
      ) : null}
      <TextField
        id="email"
        label="Email"
        type="email"
        value={email}
        onValueChange={setEmail}
        autoComplete="email"
        inputMode="email"
      />
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Mengirim..." : "Kirim ulang tautan verifikasi"}
      </Button>
    </form>
  );
}
