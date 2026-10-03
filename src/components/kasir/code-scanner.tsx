"use client";

import type { Html5Qrcode } from "html5-qrcode";
import {
  CameraOff,
  RotateCcw,
  SwitchCamera,
  Zap,
  ZapOff,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useInAppBrowser } from "@/components/shared/use-in-app-browser";
import { Button } from "@/components/ui/button";
import { findRearCameraIndex, type CameraOption } from "@/lib/device";
import { cn } from "@/lib/utils";

type ScanMode = "qr" | "barcode";

type CodeScannerProps = {
  onDecode: (text: string) => void;
  // Saat aktif, hasil pemindaian diabaikan agar satu kode tidak diproses
  // berulang kali (mis. ketika dialog konfirmasi sedang tampil).
  paused?: boolean;
  // "qr" untuk QR akun pelanggan, "barcode" untuk Code 128 voucher.
  scanMode?: ScanMode;
};

type CameraErrorReason =
  | "insecure"
  | "unsupported"
  | "permission"
  | "not-found"
  | "unknown";

const ARIA_LABEL: Record<ScanMode, string> = {
  qr: "Area pemindaian QR",
  barcode: "Area pemindaian barcode",
};

// Pesan kegagalan kamera dibedakan agar kasir tahu langkah tepatnya
// (PRD §9 Kompatibilitas Perangkat: kamera hanya aktif pada konteks aman).
const CAMERA_ERROR_TEXT: Record<
  CameraErrorReason,
  { title: string; body: string }
> = {
  insecure: {
    title: "Kamera memerlukan koneksi aman",
    body: "Akses kamera hanya tersedia melalui HTTPS. Pastikan alamat situs diawali https:// lalu coba lagi.",
  },
  unsupported: {
    title: "Kamera tidak didukung",
    body: "Peramban ini tidak menyediakan akses kamera. Gunakan input manual, atau buka halaman ini di Chrome (Android) atau Safari (iOS).",
  },
  permission: {
    title: "Izin kamera ditolak",
    body: "Izinkan akses kamera pada pengaturan peramban, lalu coba lagi.",
  },
  "not-found": {
    title: "Kamera tidak ditemukan",
    body: "Perangkat ini tidak memiliki kamera yang dapat dipakai. Gunakan input manual.",
  },
  unknown: {
    title: "Kamera tidak dapat diakses",
    body: "Izinkan akses kamera pada browser, atau buka halaman ini di browser utama (bukan di dalam aplikasi lain), lalu coba lagi.",
  },
};

// html5-qrcode dapat melempar DOMException maupun string; klasifikasikan
// berdasarkan nama galat agar arahan ke pengguna tetap spesifik.
function classifyCameraError(error: unknown): CameraErrorReason {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "string"
        ? error
        : "";

  if (/NotAllowed|Permission|Security/i.test(name)) return "permission";
  if (/NotFound|Overconstrained|DevicesNotFound/i.test(name)) return "not-found";

  return "unknown";
}

// Viewport pemindaian kamera (PRD §5.2 fitur 1 & 4, design.md §9.3). Kamera
// berjalan penuh lebar, senter tersedia bila perangkat mendukung, dan kegagalan
// kamera menampilkan panduan serta tombol coba lagi. Pustaka html5-qrcode
// dimuat dinamis agar tidak ikut bundel server.
export function CodeScanner({
  onDecode,
  paused = false,
  scanMode = "qr",
}: CodeScannerProps) {
  const containerId = `kasir-scan-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onDecodeRef = useRef(onDecode);
  const pausedRef = useRef(paused);
  const lastDecodeRef = useRef<{ text: string; at: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraError, setCameraError] = useState<CameraErrorReason | null>(
    null,
  );
  // `cameraId` null berarti pemilihan otomatis (utamakan kamera belakang).
  // Nilai ini diisi saat kasir menekan "Ganti kamera".
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { label: inAppBrowser } = useInAppBrowser();

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
      setCameraError(null);
      setTorchOn(false);
      setTorchSupported(false);

      // Konteks aman (HTTPS) dan dukungan getUserMedia diperiksa lebih dahulu
      // agar pesan yang tampil sesuai penyebabnya.
      if (!window.isSecureContext) {
        setCameraError("insecure");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("unsupported");
        return;
      }

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );
        if (cancelled) return;

        // `facingMode: "environment"` hanya petunjuk dan dapat diabaikan
        // sebagian peramban, sehingga kamera depan bisa terbuka. Bila label
        // perangkat tersedia, pilih kamera belakang lewat deviceId secara
        // eksplisit; bila tidak, andalkan petunjuk facingMode.
        let source: string | MediaTrackConstraints = cameraId ?? {
          facingMode: "environment",
        };

        try {
          const devices = await Html5Qrcode.getCameras();
          if (cancelled) return;
          setCameras(devices);

          if (!cameraId) {
            const rearIndex = findRearCameraIndex(devices);
            if (rearIndex !== -1) source = devices[rearIndex].id;
          }
        } catch {
          // Enumerasi gagal (izin belum ada atau label kosong): gunakan
          // petunjuk facingMode.
        }

        scanner = new Html5Qrcode(containerId, {
          verbose: false,
          formatsToSupport:
            scanMode === "qr"
              ? [Html5QrcodeSupportedFormats.QR_CODE]
              : [Html5QrcodeSupportedFormats.CODE_128],
        });
        scannerRef.current = scanner;

        await scanner.start(
          source,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              if (scanMode === "barcode") {
                return {
                  width: Math.floor(viewfinderWidth * 0.85),
                  height: Math.floor(viewfinderHeight * 0.4),
                };
              }

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

        setActiveCameraId(typeof source === "string" ? source : null);

        const capabilities = scanner.getRunningTrackCapabilities() as
          MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(capabilities.torch === true);
      } catch (error) {
        if (!cancelled) setCameraError(classifyCameraError(error));
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
  }, [attempt, cameraId, containerId, scanMode]);

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

  // Menggilir kamera yang tersedia agar kasir dapat memilih manual bila
  // perangkat membuka kamera yang salah.
  const switchCamera = useCallback(() => {
    if (cameras.length < 2) return;

    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % cameras.length;

    setCameraId(cameras[nextIndex].id);
  }, [activeCameraId, cameras]);

  if (cameraError) {
    const text = CAMERA_ERROR_TEXT[cameraError];

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
          {text.title}
        </h2>
        <p className="text-sm text-brand-brown-muted">{text.body}</p>
        {inAppBrowser ? (
          <p className="text-sm text-brand-brown-muted">
            Halaman ini sedang dibuka di dalam {inAppBrowser}. Ketuk menu
            peramban, lalu pilih <strong>Buka di Browser</strong>.
          </p>
        ) : null}
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
        aria-label={ARIA_LABEL[scanMode]}
      />
      {cameras.length > 1 ? (
        <Button
          type="button"
          variant="secondary"
          onClick={switchCamera}
          className="absolute bottom-3 left-3 h-11"
        >
          <SwitchCamera aria-hidden className="size-5" />
          Ganti kamera
        </Button>
      ) : null}
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
