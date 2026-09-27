"use client";

import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { toFieldErrors } from "@/lib/registration";
import { changePasswordFormSchema } from "@/lib/settings";
import { changeCustomerPassword } from "@/server/customer/settings";

// Form perubahan kata sandi (PRD §5.1 fitur 7). Memerlukan kata sandi saat ini
// dan mencabut sesi di perangkat lain setelah berhasil (PRD §9).
export function PasswordForm() {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(key: keyof typeof values, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = changePasswordFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await changeCustomerPassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ tone: "success", text: result.message });
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal mengubah kata sandi.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <TextField
        id="currentPassword"
        label="Kata sandi saat ini"
        type="password"
        value={values.currentPassword}
        onValueChange={(value) => update("currentPassword", value)}
        autoComplete="current-password"
        error={fieldErrors.currentPassword}
      />
      <TextField
        id="newPassword"
        label="Kata sandi baru"
        type="password"
        value={values.newPassword}
        onValueChange={(value) => update("newPassword", value)}
        autoComplete="new-password"
        hint="Minimal 8 karakter."
        error={fieldErrors.newPassword}
      />
      <TextField
        id="confirmPassword"
        label="Konfirmasi kata sandi baru"
        type="password"
        value={values.confirmPassword}
        onValueChange={(value) => update("confirmPassword", value)}
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Mengubah kata sandi..." : "Ubah kata sandi"}
      </Button>
    </form>
  );
}
