"use client";

import { CircleCheck, CircleX, Keyboard, RotateCcw, ScanLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { CodeScanner } from "@/components/kasir/code-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimeWita } from "@/lib/datetime";
import {
  isVoucherCode,
  normalizeVoucherCode,
} from "@/lib/voucher-code";
import {
  validateVoucher,
  type ValidateVoucherResult,
} from "@/server/kasir/validate-voucher";

type ValidationResult =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "valid"; voucherCode: string; rewardTitle: string }
  | { kind: "invalid"; message: string };

const INVALID_FORMAT_MESSAGE = "Format kode voucher tidak dikenali.";

function describeFailure(response: Extract<ValidateVoucherResult, { ok: false }>) {
  if (response.code === "USED" && response.usedAt) {
    return `Voucher sudah terpakai pada ${formatDateTimeWita(response.usedAt)}.`;
  }

  return response.message;
}

// Validasi voucher lewat pemindaian barcode atau input kode manual (PRD §5.2
// fitur 4–5, §8.4; design.md §9.3–9.4). Pembaruan status dilakukan atomik di
// server; komponen ini hanya menampilkan notifikasi hijau atau merah.
export function ValidateVoucherPanel() {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ValidationResult>({ kind: "none" });
  const busyRef = useRef(false);

  const handleCode = useCallback(async (raw: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const normalized = normalizeVoucherCode(raw);

    if (!isVoucherCode(normalized)) {
      setResult({ kind: "invalid", message: INVALID_FORMAT_MESSAGE });
      return;
    }

    setResult({ kind: "loading" });

    try {
      const response = await validateVoucher(normalized);

      if (response.ok) {
        setResult({
          kind: "valid",
          voucherCode: response.voucherCode,
          rewardTitle: response.rewardTitle,
        });
        return;
      }

      setResult({ kind: "invalid", message: describeFailure(response) });
    } catch {
      setResult({
        kind: "invalid",
        message: "Terjadi kendala saat memvalidasi voucher. Silakan coba lagi.",
      });
    }
  }, []);

  const reset = useCallback(() => {
    busyRef.current = false;
    setCode("");
    setResult({ kind: "none" });
  }, []);

  const isResolved = result.kind === "valid" || result.kind === "invalid";

  return (
    <div className="flex flex-col gap-4">
      {isResolved ? null : (
        <>
          {mode === "scan" ? (
            <CodeScanner
              onDecode={handleCode}
              paused={result.kind === "loading"}
              scanMode="barcode"
            />
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (code.trim().length > 0) void handleCode(code);
              }}
              className="flex flex-col gap-2"
            >
              <Label htmlFor="kasir-kode-voucher">Kode voucher</Label>
              <Input
                id="kasir-kode-voucher"
                name="kasir-kode-voucher"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="DJN-XXXXXXXXXXXXXXXX"
                className="h-12 bg-card font-mono text-base tracking-wider"
                disabled={result.kind === "loading"}
              />
              <Button
                type="submit"
                disabled={result.kind === "loading" || code.trim().length === 0}
                className="h-12 w-full"
              >
                Validasi kode
              </Button>
            </form>
          )}

          {mode === "scan" ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={() => setMode("manual")}
            >
              <Keyboard aria-hidden className="size-5" />
              Input kode manual
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full"
              onClick={() => setMode("scan")}
            >
              <ScanLine aria-hidden className="size-5" />
              Kembali ke pemindai barcode
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
            Memvalidasi voucher...
          </p>
        ) : null}

        {result.kind === "valid" ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-donut-matcha/40 bg-donut-matcha/10 p-6 text-center">
            <CircleCheck
              aria-hidden
              className="size-12 text-donut-matcha-deep"
            />
            <h2 className="font-display text-2xl font-bold text-donut-matcha-deep">
              Voucher sah
            </h2>
            <p className="font-display text-lg font-semibold text-brand-brown-dark">
              {result.rewardTitle}
            </p>
            <p className="font-mono text-sm uppercase tracking-wider text-brand-brown-muted">
              {result.voucherCode}
            </p>
            <p className="mt-1 font-medium text-brand-brown-dark">
              Potong harga di POS.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11"
              onClick={reset}
            >
              <RotateCcw aria-hidden className="size-4" />
              Validasi voucher lain
            </Button>
          </div>
        ) : null}

        {result.kind === "invalid" ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-donut-berry/40 bg-donut-berry/10 p-6 text-center">
            <CircleX aria-hidden className="size-12 text-donut-berry-deep" />
            <h2 className="font-display text-2xl font-bold text-donut-berry-deep">
              Voucher tidak sah
            </h2>
            <p className="text-sm text-donut-berry-deep">{result.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11"
              onClick={reset}
            >
              <RotateCcw aria-hidden className="size-4" />
              Validasi voucher lain
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
