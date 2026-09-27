"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { UsernameField } from "@/components/auth/username-field";
import { Button } from "@/components/ui/button";
import { completeCustomerUsername } from "@/server/auth/complete-username";

function ignoreAvailability() {
  // Ketersediaan sudah ditampilkan oleh UsernameField; tombol submit tidak
  // dimatikan hanya karena formulir belum valid (design.md §8).
}

export function CompleteUsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);
    setIsSubmitting(true);

    const result = await completeCustomerUsername({ username });

    setIsSubmitting(false);

    if (result.ok) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setFormMessage(result.message ?? null);
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formMessage ? <FormAlert tone="error">{formMessage}</FormAlert> : null}
      <UsernameField
        id="username"
        value={username}
        onValueChange={setUsername}
        onAvailabilityChange={ignoreAvailability}
        error={fieldErrors.username}
      />
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Menyimpan username..." : "Simpan username"}
      </Button>
    </form>
  );
}
