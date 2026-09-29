"use client";

import Link from "next/link";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/registration";

type SignInError = {
  code?: string;
  status?: number;
  message?: string;
};

function describeSignInError(error: SignInError): {
  message: string;
  showResend: boolean;
} {
  if (error.code === "EMAIL_NOT_VERIFIED") {
    return {
      message:
        "Email Anda belum diverifikasi. Kami dapat mengirim ulang tautan verifikasi.",
      showResend: true,
    };
  }

  // Akun dinonaktifkan (kasir dinonaktifkan atau pelanggan di-suspend) ditolak
  // oleh hook sesi Better-Auth (PRD §8.6, §8.3).
  if (error.code === "ACCOUNT_INACTIVE") {
    return {
      message:
        "Akun Anda sedang dinonaktifkan. Hubungi Super Admin untuk mengaktifkan kembali.",
      showResend: false,
    };
  }

  if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
    return {
      message: "Email atau kata sandi salah. Periksa kembali lalu coba lagi.",
      showResend: false,
    };
  }

  if (error.status === 429) {
    return {
      message:
        "Terlalu banyak percobaan masuk. Silakan coba lagi beberapa saat lagi.",
      showResend: false,
    };
  }

  return {
    message: "Tidak dapat masuk saat ini. Coba lagi sebentar lagi.",
    showResend: false,
  };
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{
    message: string;
    showResend: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = signInSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError({
        message:
          parsed.error.issues[0]?.message ?? "Periksa kembali data Anda.",
        showResend: false,
      });
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      // Proxy mengarahkan ke beranda sesuai peran setelah login.
      callbackURL: "/",
    });

    if (signInError) {
      setIsSubmitting(false);
      setError(describeSignInError(signInError as SignInError));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error ? (
        <div className="flex flex-col gap-2">
          <FormAlert tone="error">{error.message}</FormAlert>
          {error.showResend ? (
            <Link
              href={`/verifikasi-email?email=${encodeURIComponent(email)}`}
              className="text-sm font-medium text-brand-orange-deep underline"
            >
              Kirim ulang tautan verifikasi
            </Link>
          ) : null}
        </div>
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
      <div className="flex flex-col gap-2">
        <TextField
          id="password"
          label="Kata sandi"
          type="password"
          value={password}
          onValueChange={setPassword}
          autoComplete="current-password"
        />
        <Link
          href="/lupa-sandi"
          className="self-end text-xs font-medium text-brand-orange-deep underline"
        >
          Lupa kata sandi?
        </Link>
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Memproses..." : "Masuk"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-brand-brown-muted">
        <span className="h-px flex-1 bg-warm-border" />
        atau
        <span className="h-px flex-1 bg-warm-border" />
      </div>

      <GoogleAuthButton callbackURL="/lengkapi-username" label="Masuk dengan Google" />

      <p className="text-center text-sm text-brand-brown-muted">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-brand-orange-deep underline">
          Daftar
        </Link>
      </p>
    </form>
  );
}
