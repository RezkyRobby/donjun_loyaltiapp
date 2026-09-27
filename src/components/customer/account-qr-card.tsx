"use client";

import { Maximize2, WifiOff, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import { useOnlineStatus } from "@/components/shared/use-online-status";
import { Button } from "@/components/ui/button";
import { buildAccountQrPayload } from "@/lib/pwa";

// Ukuran render minimum 240px pada layar 375px (design.md §9.1); mode perbesar
// memberi permukaan pindai lebih lega.
const QR_SIZE = 240;
const QR_SIZE_LARGE = 320;

// Tipe minimal Wake Lock API agar tidak bergantung pada versi lib.dom. Sebagian
// peramban mobile belum mendukungnya, sehingga permintaan selalu dibungkus
// pengecekan runtime.
type WakeLockSentinelLike = { release: () => Promise<unknown> };
type WakeLockLike = {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
};

// Kartu QR Code akun (PRD §5.1 fitur 4, design.md §9.1). Payload hanya
// `DONJUN:v1:<username>`, dirender hitam di atas putih dengan quiet zone 4
// modul. Saat mode perbesar dibuka, wake lock diaktifkan agar layar tidak
// meredup ketika dipindai kasir.
export function AccountQrCard({ username }: { username: string }) {
  const payload = buildAccountQrPayload(username);
  const isOnline = useOnlineStatus();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isEnlarged, setIsEnlarged] = useState(false);

  useEffect(() => {
    if (!isEnlarged) return;

    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike })
      .wakeLock;
    let sentinel: WakeLockSentinelLike | null = null;

    async function acquire() {
      if (!wakeLock) return;

      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        // Peramban dapat menolak permintaan (mis. tab tidak terlihat); abaikan
        // dengan tenang karena ini hanya pengoptimalan kenyamanan.
      }
    }

    // Wake lock dilepas otomatis saat tab disembunyikan; ambil ulang saat tab
    // kembali terlihat.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [isEnlarged]);

  function openEnlarged() {
    setIsEnlarged(true);
    dialogRef.current?.showModal();
  }

  function closeEnlarged() {
    dialogRef.current?.close();
  }

  return (
    <section
      aria-labelledby="qr-akun-judul"
      className="flex flex-col items-center gap-4 rounded-card border border-warm-border bg-card p-6 text-center shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="qr-akun-judul"
          className="font-display text-lg font-semibold text-brand-brown-dark"
        >
          Kartu member Anda
        </h2>
        <p className="text-sm text-brand-brown-muted">
          Tunjukkan kode ini kepada kasir saat bertransaksi.
        </p>
      </div>

      {!isOnline ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-full border border-warm-border bg-warm-neutral px-3 py-1 text-[0.8125rem] font-medium text-brand-brown-muted"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          <span>Tampilan terakhir</span>
        </p>
      ) : null}

      <QRCodeSVG
        value={payload}
        size={QR_SIZE}
        level="M"
        marginSize={4}
        bgColor="#ffffff"
        fgColor="#000000"
        title={`QR Code akun @${username}`}
        className="h-auto w-full max-w-60"
      />

      <p className="font-display text-lg font-semibold text-brand-brown-dark">
        @{username}
      </p>

      <Button
        type="button"
        onClick={openEnlarged}
        aria-haspopup="dialog"
        className="h-12 w-full"
      >
        <Maximize2 aria-hidden className="size-5" />
        Perbesar
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => setIsEnlarged(false)}
        aria-label="QR Code akun diperbesar"
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-brand-white p-0 text-brand-brown-dark [&::backdrop]:bg-brand-brown-dark/70"
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <Button
              type="button"
              variant="ghost"
              onClick={closeEnlarged}
              className="h-11"
            >
              <X aria-hidden className="size-5" />
              Tutup
            </Button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <QRCodeSVG
              value={payload}
              size={QR_SIZE_LARGE}
              level="M"
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#000000"
              title={`QR Code akun @${username}`}
              className="h-auto w-full max-w-80"
            />
            <div className="flex flex-col gap-1 text-center">
              <p className="font-display text-xl font-bold">@{username}</p>
              <p className="text-sm text-brand-brown-muted">
                Tunjukkan layar ini kepada kasir.
              </p>
            </div>
          </div>
        </div>
      </dialog>
    </section>
  );
}
