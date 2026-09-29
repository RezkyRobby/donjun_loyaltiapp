"use client";

import Link from "next/link";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { TextField } from "@/components/auth/text-field";
import { UsernameField } from "@/components/auth/username-field";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { TermsContent } from "@/components/legal/terms-content";
import { Button } from "@/components/ui/button";
import { registrationFormSchema, toFieldErrors } from "@/lib/registration";
import { registerCustomer } from "@/server/auth/register";

const INITIAL_VALUES = {
  name: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  confirmPassword: "",
  consent: false,
};

export function RegisterForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  function update<K extends keyof typeof INITIAL_VALUES>(
    key: K,
    value: (typeof INITIAL_VALUES)[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const parsed = registrationFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await registerCustomer({
      name: parsed.data.name,
      email: parsed.data.email,
      username: parsed.data.username,
      phone: parsed.data.phone,
      password: parsed.data.password,
      consent: parsed.data.consent,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setRegisteredEmail(parsed.data.email);
      return;
    }

    setFormMessage(result.message);
    setFieldErrors(result.fieldErrors ?? {});
  }

  if (registeredEmail) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="success">
          Akun berhasil dibuat. Kami telah mengirim tautan verifikasi ke{" "}
          {registeredEmail}. Buka email tersebut untuk mengaktifkan akun Anda.
        </FormAlert>
        <p className="text-sm text-brand-brown-muted">
          Belum menerima email? Periksa folder spam, lalu kirim ulang dari
          halaman verifikasi.
        </p>
        <Button asChild variant="secondary" className="h-12 w-full">
          <Link
            href={`/verifikasi-email?email=${encodeURIComponent(registeredEmail)}`}
          >
            Buka halaman verifikasi
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formMessage ? <FormAlert tone="error">{formMessage}</FormAlert> : null}

      <TextField
        id="name"
        label="Nama lengkap"
        value={values.name}
        onValueChange={(value) => update("name", value)}
        autoComplete="name"
        error={fieldErrors.name}
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        value={values.email}
        onValueChange={(value) => update("email", value)}
        autoComplete="email"
        inputMode="email"
        error={fieldErrors.email}
      />
      <TextField
        id="phone"
        label="Nomor telepon (opsional)"
        type="tel"
        value={values.phone}
        onValueChange={(value) => update("phone", value)}
        autoComplete="tel"
        inputMode="tel"
        required={false}
        hint="Dipakai admin untuk membantu menemukan akun Anda."
        error={fieldErrors.phone}
      />
      <UsernameField
        id="username"
        value={values.username}
        onValueChange={(value) => update("username", value)}
        onAvailabilityChange={() => undefined}
        error={fieldErrors.username}
      />
      <TextField
        id="password"
        label="Kata sandi"
        type="password"
        value={values.password}
        onValueChange={(value) => update("password", value)}
        autoComplete="new-password"
        hint="Minimal 8 karakter."
        error={fieldErrors.password}
      />
      <TextField
        id="confirmPassword"
        label="Konfirmasi kata sandi"
        type="password"
        value={values.confirmPassword}
        onValueChange={(value) => update("confirmPassword", value)}
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="consent"
          className="flex items-start gap-3 text-sm text-brand-brown-dark"
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            checked={values.consent}
            onChange={(event) => update("consent", event.target.checked)}
            aria-invalid={fieldErrors.consent ? true : undefined}
            aria-describedby={fieldErrors.consent ? "consent-galat" : undefined}
            className="mt-1 size-4 shrink-0 rounded border-warm-border accent-brand-orange"
          />
          <span>
            Saya menyetujui{" "}
            <LegalDialog label="Kebijakan Privasi" title="Kebijakan Privasi">
              <PrivacyContent crossLink={false} />
            </LegalDialog>{" "}
            dan{" "}
            <LegalDialog
              label="Syarat dan Ketentuan"
              title="Syarat dan Ketentuan"
            >
              <TermsContent crossLink={false} />
            </LegalDialog>{" "}
            program loyalitas Donjun Donat.
          </span>
        </label>
        {fieldErrors.consent ? (
          <p id="consent-galat" role="alert" className="text-xs text-donut-berry-deep">
            {fieldErrors.consent}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Mendaftarkan akun..." : "Daftar"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-brand-brown-muted">
        <span className="h-px flex-1 bg-warm-border" />
        atau
        <span className="h-px flex-1 bg-warm-border" />
      </div>

      <GoogleAuthButton
        callbackURL="/lengkapi-username"
        label="Daftar dengan Google"
      />

      <p className="text-center text-sm text-brand-brown-muted">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-brand-orange-deep underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
