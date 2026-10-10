"use client";

import { ImageUp, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { uploadPaymentProof } from "@/server/customer/orders";

// Unggah bukti transfer (PRD §5.4 fitur 6, §8.7 langkah 5). Validasi tipe dan
// ukuran di klien hanya untuk UX; validasi otoritatif tetap dijalankan di server
// sebelum berkas dikirim ke Cloudinary.
const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateProof(file: File): string | null {
  if (!PROOF_TYPES.includes(file.type)) {
    return "Format gambar harus JPG, PNG, atau WebP.";
  }
  if (file.size <= 0) return "Berkas gambar tidak valid.";
  if (file.size > PROOF_MAX_BYTES) return "Ukuran gambar maksimal 5 MB.";

  return null;
}

export function UploadProofForm({ orderCode }: { orderCode: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setMessage(null);
    setFile(selected);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!file) {
      setMessage({ tone: "error", text: "Pilih berkas bukti transfer dulu." });
      return;
    }

    const validationError = validateProof(file);

    if (validationError) {
      setMessage({ tone: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);
    const result = await uploadPaymentProof({ orderCode, file });
    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.fieldErrors?.file ?? result.message,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <p className="text-sm text-brand-brown-muted">
        Unggah gambar bukti transfer (JPG, PNG, atau WebP, maksimal 5 MB).
      </p>

      <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-button border border-warm-border bg-card text-sm font-medium text-brand-brown-dark transition-colors hover:bg-warm-neutral has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
        <ImageUp aria-hidden className="size-5" />
        <span>{file ? "Ganti gambar bukti" : "Pilih gambar bukti"}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      {file ? (
        <p className="text-xs text-brand-brown-muted">
          Berkas terpilih: {file.name}
        </p>
      ) : null}

      {previewUrl ? (
        <div className="relative aspect-[3/4] w-full max-w-48 overflow-hidden rounded-button border border-warm-border bg-brand-white">
          <Image
            src={previewUrl}
            alt="Pratinjau bukti transfer"
            fill
            unoptimized
            sizes="192px"
            className="object-contain"
          />
        </div>
      ) : null}

      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Button
        type="submit"
        disabled={isSubmitting || !file}
        className="h-12 w-full"
      >
        {isSubmitting ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Kirim bukti transfer
      </Button>
    </form>
  );
}
