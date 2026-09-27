"use client";

import {
  CheckCheck,
  CircleCheck,
  CircleX,
  Maximize2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import Barcode from "react-barcode";

import { useWakeLock } from "@/components/shared/use-wake-lock";
import { Button } from "@/components/ui/button";
import { VOUCHER_STATUS_LABELS } from "@/constants/labels";
import { VoucherStatus } from "@/generated/prisma/enums";
import { formatDateTimeWita } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { CustomerVoucher } from "@/server/rewards/vouchers";

// Peta status terpusat (design.md §8): warna + ikon + label. Label diambil dari
// kamus src/constants.
const STATUS_STYLES: Record<
  VoucherStatus,
  { icon: LucideIcon; className: string }
> = {
  [VoucherStatus.ACTIVE]: {
    icon: CircleCheck,
    className:
      "border-donut-matcha/40 bg-donut-matcha/10 text-donut-matcha-deep",
  },
  [VoucherStatus.USED]: {
    icon: CheckCheck,
    className: "border-warm-border bg-warm-neutral text-brand-brown-muted",
  },
  [VoucherStatus.CANCELED]: {
    icon: CircleX,
    className: "border-donut-berry/40 bg-donut-berry/10 text-donut-berry-deep",
  },
};

// Barcode Code 128 hitam di atas putih (design.md §9.2). Kode teks dicetak
// terpisah agar mudah dibaca kasir; tinggi batang dirender ≥ 80px setelah
// diskalakan penuh lebar kartu.
const BARCODE_OPTIONS = {
  format: "CODE128",
  width: 1,
  height: 100,
  displayValue: false,
  background: "#ffffff",
  lineColor: "#000000",
  margin: 10,
} as const;

function statusNote(voucher: CustomerVoucher): string {
  if (voucher.status === VoucherStatus.USED && voucher.usedAt) {
    return `Terpakai pada ${formatDateTimeWita(voucher.usedAt)}`;
  }
  if (voucher.status === VoucherStatus.CANCELED && voucher.canceledAt) {
    return `Dibatalkan pada ${formatDateTimeWita(voucher.canceledAt)}`;
  }

  return VOUCHER_STATUS_LABELS[voucher.status];
}

// Kartu voucher pelanggan (PRD §5.1 fitur 6, design.md §9.2). Menampilkan judul
// reward, badge status, barcode Code 128, dan kode alfanumerik untuk input
// manual kasir. Voucher aktif dapat ditampilkan penuh layar dengan wake lock.
export function VoucherCard({ voucher }: { voucher: CustomerVoucher }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useWakeLock(isFullscreen);

  const status = STATUS_STYLES[voucher.status];
  const StatusIcon = status.icon;
  const isActive = voucher.status === VoucherStatus.ACTIVE;

  function openFullscreen() {
    setIsFullscreen(true);
    dialogRef.current?.showModal();
  }

  function closeFullscreen() {
    dialogRef.current?.close();
  }

  return (
    <article className="flex flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-brand-brown-dark">
          {voucher.rewardTitle}
        </h3>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-badge border px-3 py-1 text-xs font-medium",
            status.className,
          )}
        >
          <StatusIcon aria-hidden className="size-4" />
          {VOUCHER_STATUS_LABELS[voucher.status]}
        </span>
      </div>

      <div
        role="img"
        aria-label={`Barcode voucher ${voucher.voucherCode}, status ${VOUCHER_STATUS_LABELS[voucher.status]}`}
        className={cn(
          "rounded-lg bg-brand-white px-2 py-1",
          !isActive && "opacity-40",
        )}
      >
        <Barcode
          value={voucher.voucherCode}
          {...BARCODE_OPTIONS}
          className="h-auto w-full"
        />
      </div>

      <p className="text-center text-lg font-bold uppercase tracking-[0.08em] tabular-nums text-brand-brown-dark">
        {voucher.voucherCode}
      </p>

      {isActive ? (
        <>
          <p className="text-center text-sm text-brand-brown-muted">
            Tunjukkan kepada kasir sebelum membayar.
          </p>
          <Button
            type="button"
            onClick={openFullscreen}
            aria-haspopup="dialog"
            className="h-12 w-full"
          >
            <Maximize2 aria-hidden className="size-5" />
            Tampilkan ke kasir
          </Button>
        </>
      ) : (
        <p className="text-center text-sm text-brand-brown-muted">
          {statusNote(voucher)}
        </p>
      )}

      <p className="text-center text-xs text-brand-brown-muted">
        Ditukar pada {formatDateTimeWita(voucher.claimedAt)}
      </p>

      <dialog
        ref={dialogRef}
        onClose={() => setIsFullscreen(false)}
        aria-label={`Voucher ${voucher.voucherCode}`}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-brand-white p-0 text-brand-brown-dark [&::backdrop]:bg-brand-brown-dark/70"
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <Button
              type="button"
              variant="ghost"
              onClick={closeFullscreen}
              className="h-11"
            >
              <X aria-hidden className="size-5" />
              Tutup
            </Button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <p className="text-center font-display text-xl font-bold">
              {voucher.rewardTitle}
            </p>
            <div
              role="img"
              aria-label={`Barcode voucher ${voucher.voucherCode}`}
              className="w-full max-w-md rounded-lg bg-brand-white"
            >
              <Barcode
                value={voucher.voucherCode}
                {...BARCODE_OPTIONS}
                height={140}
                className="h-auto w-full"
              />
            </div>
            <p className="text-center text-xl font-bold uppercase tracking-[0.08em] tabular-nums">
              {voucher.voucherCode}
            </p>
            <p className="text-center text-sm text-brand-brown-muted">
              Tunjukkan layar ini kepada kasir sebelum membayar.
            </p>
          </div>
        </div>
      </dialog>
    </article>
  );
}
