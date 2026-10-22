"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_ACCOUNT_TYPE_LABELS } from "@/constants/labels";
import { PaymentAccountType } from "@/generated/prisma/enums";
import { toFieldErrors } from "@/lib/registration";
import {
  PAYMENT_ACCOUNT_NUMBER_MAX,
  PAYMENT_PROVIDER_NAME_MAX,
  paymentAccountFormSchema,
} from "@/lib/payment-account-admin";
import {
  createPaymentAccount,
  updatePaymentAccount,
} from "@/server/admin/payment-accounts";

// Form buat/ubah rekening tujuan transfer manual (PRD §5.3 fitur 9). Rekening
// bersifat global dan ditampilkan kepada pelanggan saat checkout. Validasi klien
// memakai skema Zod yang sama dengan server (AGENTS.md aturan 1). Gambar QRIS
// opsional diunggah ke Cloudinary melalui Server Action.

// Urutan tampil jenis rekening.
const ACCOUNT_TYPES: PaymentAccountType[] = [
  PaymentAccountType.BANK_TRANSFER,
  PaymentAccountType.EWALLET,
  PaymentAccountType.QRIS,
];

export type PaymentAccountFormInitial = {
  id: string;
  type: PaymentAccountType;
  providerName: string;
  accountNumber: string;
  accountHolder: string;
  sortOrder: string;
  isActive: boolean;
  imageUrl: string | null;
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
        <p id={`${id}-galat`} role="alert" className="text-caption text-donut-berry-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-petunjuk`} className="text-caption text-brand-brown-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PaymentAccountForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: PaymentAccountFormInitial;
}) {
  const router = useRouter();

  const [type, setType] = useState<PaymentAccountType>(
    initial?.type ?? PaymentAccountType.BANK_TRANSFER,
  );
  const [providerName, setProviderName] = useState(initial?.providerName ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? "0");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      type,
      providerName,
      accountNumber,
      accountHolder,
      sortOrder,
      isActive,
      image,
      removeImage,
    };

    const parsed = paymentAccountFormSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({
        tone: "error",
        text: "Periksa kembali data rekening pembayaran.",
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result =
      mode === "edit" && initial
        ? await updatePaymentAccount(initial.id, payload)
        : await createPaymentAccount(payload);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/pembayaran");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan rekening pembayaran.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  const showExistingImage = Boolean(existingImageUrl) && !removeImage && !image;
  const isQris = type === PaymentAccountType.QRIS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Field id="type" label="Jenis rekening" error={fieldErrors.type}>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as PaymentAccountType)}
          aria-invalid={fieldErrors.type ? true : undefined}
          aria-describedby={fieldErrors.type ? "type-galat" : undefined}
          className="h-12 w-full rounded-lg border border-input bg-card px-2.5 text-base text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          {ACCOUNT_TYPES.map((accountType) => (
            <option key={accountType} value={accountType}>
              {PAYMENT_ACCOUNT_TYPE_LABELS[accountType]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="providerName" label="Nama penyedia" error={fieldErrors.providerName}>
        <Input
          id="providerName"
          name="providerName"
          value={providerName}
          onChange={(event) => setProviderName(event.target.value)}
          maxLength={PAYMENT_PROVIDER_NAME_MAX}
          aria-invalid={fieldErrors.providerName ? true : undefined}
          aria-describedby={
            fieldErrors.providerName ? "providerName-galat" : undefined
          }
          className="h-12 bg-card"
          placeholder="Contoh: BCA"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="accountNumber"
          label={isQris ? "Nomor merchant (opsional)" : "Nomor rekening (opsional)"}
          error={fieldErrors.accountNumber}
          hint={isQris ? "Dapat dikosongkan bila memakai gambar QRIS." : undefined}
        >
          <Input
            id="accountNumber"
            name="accountNumber"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            maxLength={PAYMENT_ACCOUNT_NUMBER_MAX}
            inputMode="numeric"
            aria-invalid={fieldErrors.accountNumber ? true : undefined}
            aria-describedby={
              fieldErrors.accountNumber
                ? "accountNumber-galat"
                : "accountNumber-petunjuk"
            }
            className="h-12 bg-card"
          />
        </Field>
        <Field
          id="accountHolder"
          label="Atas nama (opsional)"
          error={fieldErrors.accountHolder}
        >
          <Input
            id="accountHolder"
            name="accountHolder"
            value={accountHolder}
            onChange={(event) => setAccountHolder(event.target.value)}
            aria-invalid={fieldErrors.accountHolder ? true : undefined}
            aria-describedby={
              fieldErrors.accountHolder ? "accountHolder-galat" : undefined
            }
            className="h-12 bg-card"
          />
        </Field>
      </div>

      <Field
        id="sortOrder"
        label="Urutan tampil"
        error={fieldErrors.sortOrder}
        hint="Angka kecil tampil lebih dahulu pada halaman checkout."
      >
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          aria-invalid={fieldErrors.sortOrder ? true : undefined}
          aria-describedby={
            fieldErrors.sortOrder ? "sortOrder-galat" : "sortOrder-petunjuk"
          }
          className="h-12 bg-card"
        />
      </Field>

      <Field
        id="image"
        label="Gambar QRIS (opsional)"
        error={fieldErrors.image}
        hint="JPG, PNG, atau WebP maksimal 5 MB. Isi untuk rekening jenis QRIS."
      >
        {showExistingImage && existingImageUrl ? (
          <div className="flex items-center gap-3">
            <Image
              src={existingImageUrl}
              alt="Pratinjau gambar rekening saat ini"
              width={120}
              height={120}
              className="size-20 rounded-button border border-warm-border object-contain"
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
          <p className="text-caption text-brand-brown-muted">
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
        Rekening aktif dan tampil saat checkout
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Simpan perubahan" : "Simpan rekening"}
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/pembayaran">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
