"use client";

import {
  CircleAlert,
  CircleX,
  LoaderCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/constants/labels";
import { OrderStatus } from "@/generated/prisma/enums";
import {
  ORDER_REJECTION_REASON_MAX,
  ORDER_REJECTION_REASON_MIN,
} from "@/lib/order";
import {
  completeOrder,
  confirmOrder,
  rejectOrder,
  type OrderActionResult,
} from "@/server/kasir/orders";

// Aksi keputusan kasir atas pesanan (PRD §5.5, §8.8): konfirmasi pembayaran,
// tolak bukti dengan alasan wajib, dan tandai selesai. Register *product*
// (design.md §2): target sentuh besar (56px), status dibawa warna + ikon + teks.
// Aksi yang tampil mengikuti status pesanan; server tetap memvalidasi ulang.
type Message = { tone: "success" | "error"; text: string };

export function OrderDecisionActions({
  orderId,
  orderCode,
  status,
}: {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const canConfirm = status === OrderStatus.AWAITING_CONFIRMATION;
  const canComplete = status === OrderStatus.IN_PROGRESS;

  function applyActionResult(result: OrderActionResult) {
    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.refresh();
      return;
    }

    setMessage({ tone: "error", text: result.message });
  }

  function handleConfirm() {
    setMessage(null);
    startTransition(async () => {
      applyActionResult(await confirmOrder({ orderId }));
    });
  }

  function handleComplete() {
    setMessage(null);
    startTransition(async () => {
      applyActionResult(await completeOrder({ orderId }));
    });
  }

  function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = reason.trim();

    if (trimmed.length < ORDER_REJECTION_REASON_MIN) {
      setReasonError(
        `Alasan penolakan minimal ${ORDER_REJECTION_REASON_MIN} karakter.`,
      );
      return;
    }

    setReasonError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await rejectOrder({ orderId, rejectionReason: trimmed });

      dialogRef.current?.close();

      if (result.ok) {
        setReason("");
        setMessage({ tone: "success", text: result.message });
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      {canConfirm ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="h-14 w-full text-base"
          >
            {isPending ? (
              <LoaderCircle
                aria-hidden
                className="size-5 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ShieldCheck aria-hidden className="size-5" />
            )}
            Konfirmasi pembayaran
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMessage(null);
              setReasonError(null);
              dialogRef.current?.showModal();
            }}
            disabled={isPending}
            className="h-14 w-full border-donut-berry/40 text-base text-donut-berry-deep hover:bg-donut-berry/10"
          >
            <CircleX aria-hidden className="size-5" />
            Tolak bukti
          </Button>
        </div>
      ) : null}

      {canComplete ? (
        <Button
          type="button"
          onClick={handleComplete}
          disabled={isPending}
          className="h-14 w-full text-base"
        >
          {isPending ? (
            <LoaderCircle
              aria-hidden
              className="size-5 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <PackageCheck aria-hidden className="size-5" />
          )}
          Tandai selesai
        </Button>
      ) : null}

      {!canConfirm && !canComplete ? (
        <FormAlert tone="info">
          Tidak ada tindakan yang tersedia untuk pesanan berstatus{" "}
          {ORDER_STATUS_LABELS[status].toLowerCase()}.
        </FormAlert>
      ) : null}

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (isPending) event.preventDefault();
        }}
        aria-labelledby="tolak-bukti-judul"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-card p-5 text-brand-brown-dark [&::backdrop]:bg-brand-brown-dark/70"
      >
        <form onSubmit={handleReject} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2
              id="tolak-bukti-judul"
              className="font-display text-lg font-semibold text-brand-brown-dark"
            >
              Tolak bukti transfer?
            </h2>
            <p className="text-sm text-brand-brown-muted">
              Pesanan {orderCode} akan ditolak dan pelanggan dapat mengunggah
              ulang bukti. Voucher yang ditempel tidak terpakai.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alasan-penolakan">Alasan penolakan</Label>
            <Textarea
              id="alasan-penolakan"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
              maxLength={ORDER_REJECTION_REASON_MAX}
              rows={3}
              disabled={isPending}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={
                reasonError ? "alasan-penolakan-error" : "alasan-penolakan-hint"
              }
              className="bg-card"
            />
            {reasonError ? (
              <p
                id="alasan-penolakan-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-donut-berry-deep"
              >
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {reasonError}
              </p>
            ) : (
              <p
                id="alasan-penolakan-hint"
                className="text-xs text-brand-brown-muted"
              >
                Minimal {ORDER_REJECTION_REASON_MIN} karakter, maksimal{" "}
                {ORDER_REJECTION_REASON_MAX}. Alasan ditampilkan ke pelanggan.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
              className="h-12 w-full"
            >
              Kembali
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-12 w-full bg-donut-berry-deep text-brand-white hover:bg-donut-berry-deep/90"
            >
              {isPending ? (
                <LoaderCircle
                  aria-hidden
                  className="size-5 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <CircleX aria-hidden className="size-5" />
              )}
              Kirim penolakan
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
