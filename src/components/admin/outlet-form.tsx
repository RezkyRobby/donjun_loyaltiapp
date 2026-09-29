"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OUTLET_ADDRESS_MAX,
  OUTLET_NAME_MAX,
  outletFormSchema,
} from "@/lib/outlet-admin";
import { toFieldErrors } from "@/lib/registration";
import { createOutlet, updateOutlet } from "@/server/admin/outlets";

// Form buat/ubah outlet (PRD §5.3 fitur 6). Validasi klien memakai skema Zod yang
// sama dengan server (AGENTS.md aturan 1) untuk umpan balik langsung.

export type OutletFormInitial = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
};

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-galat`} role="alert" className="text-xs text-donut-berry-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-petunjuk`} className="text-xs text-brand-brown-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function OutletForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: OutletFormInitial;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = { name, address, phone, isActive };
    const parsed = outletFormSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali data outlet." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result =
      mode === "edit" && initial
        ? await updateOutlet(initial.id, parsed.data)
        : await createOutlet(parsed.data);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/outlet");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan outlet.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Field id="name" label="Nama outlet" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={OUTLET_NAME_MAX}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-galat" : undefined}
          className="h-12 bg-card"
          placeholder="Contoh: Donjun Donat Panakkukang"
        />
      </Field>

      <Field id="address" label="Alamat" error={fieldErrors.address}>
        <textarea
          id="address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          rows={3}
          maxLength={OUTLET_ADDRESS_MAX}
          aria-invalid={fieldErrors.address ? true : undefined}
          aria-describedby={fieldErrors.address ? "address-galat" : undefined}
          className="min-h-24 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
      </Field>

      <Field
        id="phone"
        label="Nomor telepon (opsional)"
        error={fieldErrors.phone}
        hint="Contoh: 0411-000001."
      >
        <Input
          id="phone"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? "phone-galat" : "phone-petunjuk"}
          className="h-12 bg-card"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-brand-brown-dark">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-4 accent-brand-orange"
        />
        Outlet aktif
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Simpan perubahan" : "Simpan outlet"}
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/outlet">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
