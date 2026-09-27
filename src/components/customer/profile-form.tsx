"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { toFieldErrors } from "@/lib/registration";
import { profileUpdateSchema } from "@/lib/settings";
import { updateCustomerProfile } from "@/server/customer/settings";

// Form perubahan nama dan nomor telepon (PRD §5.1 fitur 7). Nomor telepon
// opsional dan dapat dikosongkan. Setelah berhasil, halaman disegarkan agar
// sapaan pada header ikut terbarui.
export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = profileUpdateSchema.safeParse({ name, phone });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await updateCustomerProfile({
      name: parsed.data.name,
      phone: parsed.data.phone,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan perubahan.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <TextField
        id="name"
        label="Nama lengkap"
        value={name}
        onValueChange={setName}
        autoComplete="name"
        error={fieldErrors.name}
      />
      <TextField
        id="phone"
        label="Nomor telepon (opsional)"
        type="tel"
        value={phone}
        onValueChange={setPhone}
        autoComplete="tel"
        inputMode="tel"
        required={false}
        hint="Dipakai admin untuk membantu menemukan akun Anda."
        error={fieldErrors.phone}
      />

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Menyimpan perubahan..." : "Simpan perubahan"}
      </Button>
    </form>
  );
}
