"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADJUST_NOTE_MAX_LENGTH,
  MAX_ADJUST_AMOUNT,
  adjustPointsSchema,
} from "@/lib/correction";
import { toFieldErrors } from "@/lib/registration";
import { formatPoints } from "@/lib/format";
import { adjustCustomerPoints } from "@/server/admin/points";

// Koreksi saldo poin manual (PRD §5.3 fitur 5, §8.5 langkah 4). Nilai bertanda
// (positif menambah, negatif mengurangi) dengan catatan alasan wajib. Username
// pelanggan bersifat permanen dan ditampilkan read-only. Validasi klien memakai
// skema Zod yang sama dengan server (AGENTS.md aturan 1).
export function CustomerAdjustForm({
  username,
  pointsBalance,
}: {
  username: string;
  pointsBalance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = adjustPointsSchema.safeParse({ username, amount, note });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali jumlah dan catatan." });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await adjustCustomerPoints(parsed.data);

    setIsSubmitting(false);

    if (result.ok) {
      setAmount("");
      setNote("");
      setMessage({
        tone: "success",
        text: `Saldo diperbarui menjadi ${formatPoints(result.pointsBalance)} poin.`,
      });
      router.refresh();
      return;
    }

    setMessage({ tone: "error", text: result.message });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <p className="text-sm text-brand-brown-muted">
        Saldo saat ini{" "}
        <span className="font-semibold tabular-nums text-brand-brown-dark">
          {formatPoints(pointsBalance)} poin
        </span>
        . Koreksi negatif tidak boleh melebihi saldo.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Jumlah poin</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step={1}
          min={-MAX_ADJUST_AMOUNT}
          max={MAX_ADJUST_AMOUNT}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={fieldErrors.amount ? true : undefined}
          aria-describedby={fieldErrors.amount ? "amount-galat" : "amount-petunjuk"}
          className="h-12 bg-card"
          placeholder="Contoh: 5 atau -3"
        />
        {fieldErrors.amount ? (
          <p id="amount-galat" role="alert" className="text-xs text-donut-berry-deep">
            {fieldErrors.amount}
          </p>
        ) : (
          <p id="amount-petunjuk" className="text-xs text-brand-brown-muted">
            Positif menambah saldo, negatif mengurangi. Maksimal {formatPoints(MAX_ADJUST_AMOUNT)}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Catatan alasan (wajib)</Label>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={ADJUST_NOTE_MAX_LENGTH}
          aria-invalid={fieldErrors.note ? true : undefined}
          aria-describedby={fieldErrors.note ? "note-galat" : "note-petunjuk"}
          className="min-h-24 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
          placeholder="Contoh: Koreksi karena kesalahan injeksi poin ganda"
        />
        {fieldErrors.note ? (
          <p id="note-galat" role="alert" className="text-xs text-donut-berry-deep">
            {fieldErrors.note}
          </p>
        ) : (
          <p id="note-petunjuk" className="text-xs text-brand-brown-muted">
            Catatan tersimpan pada riwayat poin dan audit log.
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          Simpan koreksi
        </Button>
      </div>
    </form>
  );
}
