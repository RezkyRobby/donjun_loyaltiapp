"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toFieldErrors } from "@/lib/registration";
import { staffCreateSchema } from "@/lib/staff-admin";
import type { OutletOption } from "@/server/admin/analytics";
import { createStaff } from "@/server/admin/staff";

// Form pembuatan akun kasir baru (PRD §5.3 fitur 4, §8.6). Mengirim undangan
// aktivasi melalui email; kasir menetapkan kata sandinya sendiri. Validasi klien
// memakai skema Zod yang sama dengan server.
export function StaffForm({ outlets }: { outlets: OutletOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = staffCreateSchema.safeParse({ name, email, outletId });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali data staf." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await createStaff(parsed.data);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/staf");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal membuat akun staf.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      {outlets.length === 0 ? (
        <FormAlert tone="info">
          Belum ada outlet aktif. Buat outlet terlebih dahulu pada menu Outlet
          sebelum menambah staf.
        </FormAlert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nama lengkap</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-galat" : undefined}
          className="h-12 bg-card"
        />
        {fieldErrors.name ? (
          <p id="name-galat" role="alert" className="text-xs text-donut-berry-deep">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "email-galat" : "email-petunjuk"}
          className="h-12 bg-card"
        />
        {fieldErrors.email ? (
          <p id="email-galat" role="alert" className="text-xs text-donut-berry-deep">
            {fieldErrors.email}
          </p>
        ) : (
          <p id="email-petunjuk" className="text-xs text-brand-brown-muted">
            Undangan aktivasi dikirim ke email ini. Satu email hanya untuk satu
            akun.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="outletId">Outlet penugasan</Label>
        <select
          id="outletId"
          name="outletId"
          value={outletId}
          onChange={(event) => setOutletId(event.target.value)}
          aria-invalid={fieldErrors.outletId ? true : undefined}
          aria-describedby={
            fieldErrors.outletId ? "outletId-galat" : undefined
          }
          className="h-12 w-full rounded-lg border border-input bg-card px-2.5 text-base text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          {outlets.length === 0 ? (
            <option value="">Belum ada outlet</option>
          ) : null}
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name}
            </option>
          ))}
        </select>
        {fieldErrors.outletId ? (
          <p
            id="outletId-galat"
            role="alert"
            className="text-xs text-donut-berry-deep"
          >
            {fieldErrors.outletId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || outlets.length === 0}
          className="h-12"
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          Buat akun &amp; kirim undangan
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/staf">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
