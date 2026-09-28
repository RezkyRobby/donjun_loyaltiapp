"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { CameraOff, RotateCcw, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QrScannerProps = {
  onDecode: (text: string) => void;
  // Saat aktif, hasil pemindaian diabaikan agar satu kode tidak diproses
  // berulang kali (mis. ketika dialog konfirmasi sedang tampil).
  paused?: boolean;
};

// Viewport pemindaian QR akun pelanggan (PRD §5.2 fitur 1, design.md §9.3).
// Kamera berjalan penuh lebar, senter tersedia bila perangkat mendukung, dan
// kegagalan kamera menampilkan panduan serta tombol coba lagi. Pustaka
// html5-qrcode dimuat dinamis agar tidak ikut bundel server.
export function QrScanner({ onDecode, paused = false }: QrScannerProps) {
  const containerId = `kasir-scan-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onDecodeRef = useRef(onDecode);
  const pausedRef = useRef(paused);
  const lastDecodeRef = useRef<{ text: string; at: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    async function start() {
      setCameraError(false);

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );
        if (cancelled) return;

        scanner = new Html5Qrcode(containerId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.floor(
                Math.min(viewfinderWidth, viewfinderHeight) * 0.7,
              );

              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            if (pausedRef.current) return;

            const now = Date.now();
            const last = lastDecodeRef.current;

            // Abaikan kode yang sama yang masih terlihat kamera.
            if (last && last.text === decodedText && now - last.at < 2500) return;

            lastDecodeRef.current = { text: decodedText, at: now };
            onDecodeRef.current(decodedText);
          },
          () => {
            // Kerangka tanpa kode terbaca: bukan kesalahan.
          },
        );

        if (cancelled) return;

        const capabilities = scanner.getRunningTrackCapabilities() as
          MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(capabilities.torch === true);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    void start();

    return () => {
      cancelled = true;
      const instance = scanner;
      scannerRef.current = null;

      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {
            // Scanner belum berjalan atau sudah berhenti: tidak perlu dibersihkan.
          });
      }
    };
  }, [attempt, containerId]);

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    const next = !torchOn;

    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      // Perangkat menolak kendali senter: sembunyikan tombolnya.
      setTorchSupported(false);
    }
  }, [torchOn]);

  if (cameraError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center"
      >
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
        >
          <CameraOff className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
          Kamera tidak dapat diakses
        </h2>
        <p className="text-sm text-brand-brown-muted">
          Izinkan akses kamera pada browser, atau buka halaman ini di browser
          utama (bukan di dalam aplikasi lain), lalu coba lagi.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => setAttempt((value) => value + 1)}
        >
          <RotateCcw aria-hidden className="size-4" />
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-brand-brown-dark">
      <div
        id={containerId}
        className="[&_video]:block [&_video]:w-full"
        aria-label="Area pemindaian QR"
      />
      {torchSupported ? (
        <Button
          type="button"
          variant="secondary"
          aria-pressed={torchOn}
          onClick={toggleTorch}
          className={cn(
            "absolute bottom-3 right-3 h-11",
            torchOn && "bg-brand-yellow",
          )}
        >
          {torchOn ? (
            <ZapOff aria-hidden className="size-5" />
          ) : (
            <Zap aria-hidden className="size-5" />
          )}
          Senter
        </Button>
      ) : null}
    </div>
  );
}
