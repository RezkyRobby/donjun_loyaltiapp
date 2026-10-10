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
  MENU_CATEGORY_NAME_MAX,
  MENU_CATEGORY_SORT_MAX,
  menuCategoryFormSchema,
} from "@/lib/menu-category-admin";
import { toFieldErrors } from "@/lib/registration";
import {
  createMenuCategory,
  updateMenuCategory,
} from "@/server/admin/menu-categories";

// Form buat/ubah kategori menu (PRD §5.3 fitur 7). Validasi klien memakai skema
// Zod yang sama dengan server (AGENTS.md aturan 1) untuk umpan balik langsung.

export type MenuCategoryFormInitial = {
  id: string;
  name: string;
  sortOrder: string;
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

export function MenuCategoryForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: MenuCategoryFormInitial;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? "0");
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

    const payload = { name, sortOrder, isActive };
    const parsed = menuCategoryFormSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali data kategori menu." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result =
      mode === "edit" && initial
        ? await updateMenuCategory(initial.id, parsed.data)
        : await createMenuCategory(parsed.data);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/kategori");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan kategori menu.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Field id="name" label="Nama kategori" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MENU_CATEGORY_NAME_MAX}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-galat" : undefined}
          className="h-12 bg-card"
          placeholder="Contoh: Donat Klasik"
        />
      </Field>

      <Field
        id="sortOrder"
        label="Urutan tampil"
        error={fieldErrors.sortOrder}
        hint="Angka kecil tampil lebih dahulu pada katalog belanja."
      >
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          max={MENU_CATEGORY_SORT_MAX}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          aria-invalid={fieldErrors.sortOrder ? true : undefined}
          aria-describedby={
            fieldErrors.sortOrder ? "sortOrder-galat" : "sortOrder-petunjuk"
          }
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
        Kategori aktif dan tampil di katalog belanja
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Simpan perubahan" : "Simpan kategori"}
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/kategori">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
