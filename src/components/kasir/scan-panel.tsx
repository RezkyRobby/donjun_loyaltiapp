"use client";

import { CircleAlert, Keyboard, RotateCcw, ScanLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { InjectPointsDialog } from "@/components/kasir/inject-points-dialog";
import { QrScanner } from "@/components/kasir/qr-scanner";
import { UsernameSearch } from "@/components/kasir/username-search";
import { Button } from "@/components/ui/button";
import { parseAccountQrPayload } from "@/lib/account-qr";
import type { InjectableMethod } from "@/lib/injection";
import { scanCustomerQrAction } from "@/server/kasir/actions";
import type { CashierCustomer } from "@/server/kasir/customers";

type IdentityResult =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "found"; customer: CashierCustomer; method: InjectableMethod }
  | { kind: "error"; message: string };

const INVALID_QR_MESSAGE =
  "QR bukan milik platform Donjun Donat. Minta pelanggan menampilkan QR dari aplikasi Donjun.";

// Identifikasi pelanggan lewat QR atau input username manual, lalu pop-up
// konfirmasi injeksi poin (PRD §5.2 fitur 1–3, §8.3). Payload QR divalidasi
// versinya di klien untuk umpan balik seketika, lalu diulang di Server Action
// sebelum lookup (AGENTS.md aturan 1).
export function ScanPanel() {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [result, setResult] = useState<IdentityResult>({ kind: "none" });
  // Penjaga sinkron: mencegah pemrosesan ganda sebelum render ulang menandai
  // pemindai sebagai paused.
  const busyRef = useRef(false);

  const handleDecode = useCallback(async (payload: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const parsed = parseAccountQrPayload(payload);
    if (!parsed.valid) {
      setResult({ kind: "error", message: INVALID_QR_MESSAGE });
      return;
    }

    setResult({ kind: "loading" });

    try {
      const response = await scanCustomerQrAction(payload);

      switch (response.status) {
        case "FOUND":
          setResult({
            kind: "found",
            customer: response.customer,
            method: "QR_SCAN",
          });
          return;
        case "NOT_FOUND":
          setResult({
            kind: "error",
            message: `Username @${parsed.username} tidak ditemukan. Pastikan akun pelanggan sudah benar.`,
          });
          return;
        case "UNAUTHORIZED":
          setResult({
            kind: "error",
            message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
          });
          return;
        default:
          setResult({ kind: "error", message: INVALID_QR_MESSAGE });
      }
    } catch {
      setResult({
        kind: "error",
        message: "Terjadi kendala saat memeriksa QR. Silakan coba lagi.",
      });
    }
  }, []);

  const handleSelect = useCallback((customer: CashierCustomer) => {
    busyRef.current = true;
    setResult({ kind: "found", customer, method: "USERNAME" });
  }, []);

  const reset = useCallback(() => {
    busyRef.current = false;
    setResult({ kind: "none" });
  }, []);

  const isResolved = result.kind !== "none" && result.kind !== "loading";

  return (
    <div className="flex flex-col gap-4">
      {isResolved ? null : (
        <>
          {mode === "scan" ? (
            <QrScanner
              onDecode={handleDecode}
              paused={result.kind === "loading"}
            />
          ) : (
            <UsernameSearch onSelect={handleSelect} />
          )}

          {mode === "scan" ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={() => setMode("manual")}
            >
              <Keyboard aria-hidden className="size-5" />
              Input username manual
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full"
              onClick={() => setMode("scan")}
            >
              <ScanLine aria-hidden className="size-5" />
              Kembali ke pemindai QR
            </Button>
          )}
        </>
      )}

      <div aria-live="polite">
        {result.kind === "loading" ? (
          <p className="flex items-center justify-center gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm text-brand-brown-muted">
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border-2 border-brand-brown-muted border-t-transparent motion-reduce:animate-none"
            />
            Memeriksa QR...
          </p>
        ) : null}

        {result.kind === "error" ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-donut-berry/40 bg-donut-berry/10 p-6 text-center">
            <CircleAlert aria-hidden className="size-10 text-donut-berry-deep" />
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Pelanggan tidak dapat diidentifikasi
            </h2>
            <p className="text-sm text-donut-berry-deep">{result.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11"
              onClick={reset}
            >
              <RotateCcw aria-hidden className="size-4" />
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>

      {result.kind === "found" ? (
        <InjectPointsDialog
          customer={result.customer}
          method={result.method}
          onClose={reset}
        />
      ) : null}
    </div>
  );
}
