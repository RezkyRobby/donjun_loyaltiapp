"use client";

import { LoaderCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/server/customer/orders";

// Pembatalan pesanan oleh pelanggan (PRD §5.4 fitur 7, §8.7). Hanya berlaku
// selama status AWAITING_PAYMENT. Konfirmasi memakai dialog native dengan fokus
// awal pada aksi paling tidak berbahaya ("Kembali"), sesuai design.md §8.
export function CancelOrderButton({ orderCode }: { orderCode: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    tone: "error";
    text: string;
  } | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelOrder({ orderCode });

      dialogRef.current?.close();

      if (result.ok) {
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => dialogRef.current?.showModal()}
        className="h-12 w-full border-donut-berry/40 text-donut-berry-deep hover:bg-donut-berry/10"
      >
        <XCircle aria-hidden className="size-5" />
        Batalkan pesanan
      </Button>

      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="batal-pesanan-judul"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-warm-border bg-card p-5 text-brand-brown-dark shadow-raised [&::backdrop]:bg-brand-brown-dark/70"
      >
        <h2
          id="batal-pesanan-judul"
          className="font-display text-lg font-semibold"
        >
          Batalkan pesanan?
        </h2>
        <p className="mt-2 text-sm text-brand-brown-muted">
          Pesanan {orderCode} akan dibatalkan. Voucher yang ditempel tidak
          terpakai dan dapat digunakan pada pesanan lain.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="h-12 w-full"
          >
            Kembali
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="h-12 w-full bg-donut-berry-deep text-brand-white hover:bg-donut-berry-deep/90"
          >
            {isPending ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : null}
            Ya, batalkan pesanan
          </Button>
        </div>
      </dialog>
    </div>
  );
}
