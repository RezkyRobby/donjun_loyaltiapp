import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-alert";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifikasi email" };

// Pemetaan kode galat pengalihan Better-Auth ke pesan Bahasa Indonesia
// (PRD §8.1 edge case: tautan verifikasi kedaluwarsa atau sudah dipakai).
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Tautan verifikasi tidak valid. Minta tautan baru di bawah.",
  TOKEN_EXPIRED:
    "Tautan verifikasi sudah kedaluwarsa. Minta tautan baru di bawah.",
  USER_NOT_FOUND: "Akun untuk tautan ini tidak ditemukan.",
  INVALID_USER: "Tautan verifikasi tidak sesuai dengan akun Anda.",
};

export default async function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawError = typeof params.error === "string" ? params.error : null;
  const email = typeof params.email === "string" ? params.email : "";

  const errorMessage = rawError
    ? (ERROR_MESSAGES[rawError] ??
      "Verifikasi email gagal. Minta tautan baru di bawah.")
    : null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Verifikasi email Anda
        </CardTitle>
        <CardDescription>
          Kami mengirim tautan verifikasi ke email yang Anda daftarkan. Buka
          tautan tersebut untuk mengaktifkan akun.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errorMessage ? <FormAlert tone="error">{errorMessage}</FormAlert> : null}
        <p className="text-sm text-brand-brown-muted">
          Belum menerima email atau tautan sudah kedaluwarsa? Masukkan email
          Anda untuk mengirim ulang. Pengiriman dibatasi 5 email per akun per
          hari.
        </p>
        <ResendVerificationForm initialEmail={email} />
      </CardContent>
    </Card>
  );
}
