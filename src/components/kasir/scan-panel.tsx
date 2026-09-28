"use client";

import { CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { QrScanner } from "@/components/kasir/qr-scanner";
import { Button } from "@/components/ui/button";
import { parseAccountQrPayload } from "@/lib/account-qr";
import { scanCustomerQrAction } from "@/server/kasir/actions";
import type { CashierCustomer } from "@/server/kasir/customers";

type ScanState =
  | { phase: "scanning" }
  | { phase: "loading" }
  | { phase: "found"; customer: CashierCustomer }
  | { phase: "error"; message: string };

const INVALID_QR_MESSAGE =
  "QR bukan milik platform Donjun Donat. Minta pelanggan menampilkan QR dari aplikasi Donjun.";

// Panel identifikasi pelanggan lewat QR (PRD §8.3 langkah 3–5). Payload
// divalidasi versinya di klien untuk umpan balik seketika, lalu diulang di
// Server Action sebelum lookup (AGENTS.md aturan 1). Pop-up konfirmasi injeksi
// poin ditambahkan pada Task 20.
export function ScanPanel() {
  const [state, setState] = useState<ScanState>({ phase: "scanning" });
  // Penjaga sinkron: mencegah pemrosesan ganda sebelum render ulang menandai
  // pemindai sebagai paused.
  const busyRef = useRef(false);

  const handleDecode = useCallback(async (payload: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const parsed = parseAccountQrPayload(payload);
    if (!parsed.valid) {
      setState({ phase: "error", message: INVALID_QR_MESSAGE });
      return;
    }

    setState({ phase: "loading" });

    try {
      const result = await scanCustomerQrAction(payload);

      switch (result.status) {
        case "FOUND":
          setState({ phase: "found", customer: result.customer });
          return;
        case "NOT_FOUND":
          setState({
            phase: "error",
            message: `Username @${parsed.username} tidak ditemukan. Pastikan akun pelanggan sudah benar.`,
          });
          return;
        case "UNAUTHORIZED":
          setState({
            phase: "error",
            message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
          });
          return;
        default:
          setState({ phase: "error", message: INVALID_QR_MESSAGE });
      }
    } catch {
      setState({
        phase: "error",
        message: "Terjadi kendala saat memeriksa QR. Silakan coba lagi.",
      });
    }
  }, []);

  const reset = useCallback(() => {
    busyRef.current = false;
    setState({ phase: "scanning" });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {state.phase === "found" || state.phase === "error" ? null : (
        <QrScanner
          onDecode={handleDecode}
          paused={state.phase === "loading"}
        />
      )}

      <div aria-live="polite">
        {state.phase === "loading" ? (
          <p className="flex items-center justify-center gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm text-brand-brown-muted">
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border-2 border-brand-brown-muted border-t-transparent motion-reduce:animate-none"
            />
            Memeriksa QR...
          </p>
        ) : null}

        {state.phase === "found" ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-donut-matcha/40 bg-donut-matcha/10 p-6 text-center">
            <CircleCheck
              aria-hidden
              className="size-10 text-donut-matcha-deep"
            />
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Pelanggan ditemukan
            </h2>
            <p className="font-display text-2xl font-bold text-brand-brown-dark">
              {state.customer.name}
            </p>
            <p className="text-sm text-brand-brown-muted">
              @{state.customer.username}
            </p>
            {state.customer.isActive ? null : (
              <p className="text-sm font-medium text-donut-berry-deep">
                Akun pelanggan sedang ditangguhkan.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11"
              onClick={reset}
            >
              <RotateCcw aria-hidden className="size-4" />
              Scan ulang
            </Button>
          </div>
        ) : null}

        {state.phase === "error" ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-donut-berry/40 bg-donut-berry/10 p-6 text-center">
            <CircleAlert
              aria-hidden
              className="size-10 text-donut-berry-deep"
            />
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              QR tidak dapat diproses
            </h2>
            <p className="text-sm text-donut-berry-deep">{state.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11"
              onClick={reset}
            >
              <RotateCcw aria-hidden className="size-4" />
              Scan ulang
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
