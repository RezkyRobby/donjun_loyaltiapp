"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type ReactNode } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toFieldErrors } from "@/lib/registration";
import { rewardFormSchema } from "@/lib/reward-admin";
import { createReward, updateReward } from "@/server/admin/rewards";

// Form buat/ubah reward (PRD §5.3 fitur 2). Validasi klien memakai skema Zod
// yang sama dengan server (AGENTS.md aturan 1) untuk umpan balik langsung.
// Gambar diunggah ke Cloudinary melalui Server Action; berkas baru hanya dikirim
// bila admin benar-benar memilihnya.

export type RewardFormInitial = {
  id: string;
  title: string;
  description: string;
  pointsCost: string;
  quota: string;
  perUserLimit: string;
  startAt: string;
  endAt: string;
  terms: string;
  isActive: boolean;
  imageUrl: string | null;
};

function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint?: string;
}) {
  if (error) {
    return (
      <p id={`${id}-galat`} role="alert" className="text-xs text-donut-berry-deep">
        {error}
      </p>
    );
  }

  if (hint) {
    return (
      <p id={`${id}-petunjuk`} className="text-xs text-brand-brown-muted">
        {hint}
      </p>
    );
  }

  return null;
}

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
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function RewardForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: RewardFormInitial;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pointsCost, setPointsCost] = useState(initial?.pointsCost ?? "");
  const [quota, setQuota] = useState(initial?.quota ?? "");
  const [perUserLimit, setPerUserLimit] = useState(initial?.perUserLimit ?? "");
  const [startAt, setStartAt] = useState(initial?.startAt ?? "");
  const [endAt, setEndAt] = useState(initial?.endAt ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const existingImageUrl = initial?.imageUrl ?? null;
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      title,
      description,
      pointsCost,
      quota,
      perUserLimit,
      startAt,
      endAt,
      terms,
      isActive,
      image,
      removeImage,
    };

    const parsed = rewardFormSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali data reward." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result =
      mode === "edit" && initial
        ? await updateReward(initial.id, payload)
        : await createReward(payload);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/reward");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan reward.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  const showExistingImage = Boolean(existingImageUrl) && !removeImage && !image;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Field id="title" label="Nama promo" error={fieldErrors.title}>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "title-galat" : undefined}
          className="h-12 bg-card"
          placeholder="Contoh: Gratis 1 Donat Glaze"
        />
      </Field>

      <Field id="description" label="Deskripsi (opsional)" error={fieldErrors.description}>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={
            fieldErrors.description ? "description-galat" : undefined
          }
          className="min-h-24 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          id="pointsCost"
          label="Biaya poin"
          error={fieldErrors.pointsCost}
          hint="Jumlah poin untuk menukar."
        >
          <Input
            id="pointsCost"
            name="pointsCost"
            type="number"
            min={1}
            value={pointsCost}
            onChange={(event) => setPointsCost(event.target.value)}
            aria-invalid={fieldErrors.pointsCost ? true : undefined}
            aria-describedby={
              fieldErrors.pointsCost ? "pointsCost-galat" : "pointsCost-petunjuk"
            }
            className="h-12 bg-card"
          />
        </Field>
        <Field
          id="quota"
          label="Kuota"
          error={fieldErrors.quota}
          hint="Kosongkan untuk tidak terbatas."
        >
          <Input
            id="quota"
            name="quota"
            type="number"
            min={1}
            value={quota}
            onChange={(event) => setQuota(event.target.value)}
            aria-invalid={fieldErrors.quota ? true : undefined}
            aria-describedby={fieldErrors.quota ? "quota-galat" : "quota-petunjuk"}
            className="h-12 bg-card"
            placeholder="Tidak terbatas"
          />
        </Field>
        <Field
          id="perUserLimit"
          label="Batas per pelanggan"
          error={fieldErrors.perUserLimit}
          hint="Kosongkan untuk tidak terbatas."
        >
          <Input
            id="perUserLimit"
            name="perUserLimit"
            type="number"
            min={1}
            value={perUserLimit}
            onChange={(event) => setPerUserLimit(event.target.value)}
            aria-invalid={fieldErrors.perUserLimit ? true : undefined}
            aria-describedby={
              fieldErrors.perUserLimit
                ? "perUserLimit-galat"
                : "perUserLimit-petunjuk"
            }
            className="h-12 bg-card"
            placeholder="Tidak terbatas"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="startAt" label="Tanggal mulai (opsional)" error={fieldErrors.startAt}>
          <Input
            id="startAt"
            name="startAt"
            type="date"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            aria-invalid={fieldErrors.startAt ? true : undefined}
            aria-describedby={fieldErrors.startAt ? "startAt-galat" : undefined}
            className="h-12 bg-card"
          />
        </Field>
        <Field id="endAt" label="Tanggal berakhir (opsional)" error={fieldErrors.endAt}>
          <Input
            id="endAt"
            name="endAt"
            type="date"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            aria-invalid={fieldErrors.endAt ? true : undefined}
            aria-describedby={fieldErrors.endAt ? "endAt-galat" : undefined}
            className="h-12 bg-card"
          />
        </Field>
      </div>

      <Field id="terms" label="Syarat & Ketentuan (opsional)" error={fieldErrors.terms}>
        <textarea
          id="terms"
          name="terms"
          value={terms}
          onChange={(event) => setTerms(event.target.value)}
          rows={4}
          aria-invalid={fieldErrors.terms ? true : undefined}
          aria-describedby={fieldErrors.terms ? "terms-galat" : undefined}
          className="min-h-28 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
      </Field>

      <Field
        id="image"
        label="Gambar promo (opsional)"
        error={fieldErrors.image}
        hint="JPG, PNG, atau WebP maksimal 5 MB."
      >
        {showExistingImage && existingImageUrl ? (
          <div className="flex items-center gap-3">
            <Image
              src={existingImageUrl}
              alt="Pratinjau gambar promo saat ini"
              width={160}
              height={120}
              className="h-20 w-32 rounded-button border border-border object-cover"
            />
            {mode === "edit" ? (
              <label className="flex items-center gap-2 text-sm text-brand-brown-dark">
                <input
                  type="checkbox"
                  checked={removeImage}
                  onChange={(event) => setRemoveImage(event.target.checked)}
                  className="size-4 accent-brand-orange"
                />
                Hapus gambar
              </label>
            ) : null}
          </div>
        ) : null}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          aria-invalid={fieldErrors.image ? true : undefined}
          aria-describedby={fieldErrors.image ? "image-galat" : "image-petunjuk"}
          className="block w-full cursor-pointer rounded-lg border border-input bg-card text-sm text-brand-brown-muted file:mr-3 file:border-0 file:bg-warm-neutral file:px-4 file:py-3 file:text-sm file:font-medium file:text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {image ? (
          <p className="text-xs text-brand-brown-muted">
            Berkas dipilih: {image.name}
          </p>
        ) : null}
      </Field>

      <label className="flex items-center gap-2 text-sm text-brand-brown-dark">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-4 accent-brand-orange"
        />
        Promo aktif dan tampil di katalog pelanggan
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Simpan perubahan" : "Simpan reward"}
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/reward">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
