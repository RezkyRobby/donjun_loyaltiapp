"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import type { InjectableMethod } from "@/lib/injection";
import type { CashierCustomer } from "@/server/kasir/customers";
import { injectPoints } from "@/server/kasir/inject-points";

type Phase = "idle" | "pending" | "success" | "cooldown" | "error";

// Pop-up konfirmasi injeksi poin (PRD §8.3 langkah 5–6, design.md §9.5).
// Menampilkan nama dan username saja, menonaktifkan tombol selama proses, dan
// membawa idempotency key agar retry jaringan tidak menggandakan poin.
export function InjectPointsDialog({
  customer,
  method,
  onClose,
}: {
  customer: CashierCustomer;
  method: InjectableMethod;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keyRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Hitung mundur cooldown; pembaruan hanya dari callback timeout agar tidak
  // memicu render berantai.
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setTimeout(() => {
      setRemainingSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  const submit = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPhase("pending");

    if (!keyRef.current) keyRef.current = crypto.randomUUID();

    try {
      const result = await injectPoints({
        username: customer.username,
        idempotencyKey: keyRef.current,
        method,
      });

      if (result.ok) {
        setBalance(result.pointsBalance);
        setPhase("success");
        return;
      }

      if (result.code === "COOLDOWN") {
        setRemainingSeconds(result.retryAfterSeconds ?? 0);
        setPhase("cooldown");
        return;
      }

      setMessage(result.message);
      setCanRetry(result.code === "ERROR" || result.code === "UNAUTHORIZED");
      setPhase("error");
    } catch {
      setMessage("Terjadi kendala saat menambah poin. Periksa koneksi lalu coba lagi.");
      setCanRetry(true);
      setPhase("error");
    } finally {
      pendingRef.current = false;
    }
  }, [customer.username, method]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Cooldown yang sudah selesai kembali ke keadaan siap injeksi.
  const effectivePhase: Phase =
    phase === "cooldown" && remainingSeconds === 0 ? "idle" : phase;
  const isPending = effectivePhase === "pending";
  const isSuccess = effectivePhase === "success";
  const isCooldown = effectivePhase === "cooldown";
  const isError = effectivePhase === "error";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
      aria-label={`Konfirmasi tambah poin untuk ${customer.name}`}
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-card border border-border bg-card p-0 text-brand-brown-dark backdrop:bg-brand-brown-dark/60"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Konfirmasi Tambah Poin
          </h2>
          <p className="font-display text-2xl font-bold text-brand-brown-dark">
            {customer.name}
          </p>
          <p className="text-sm text-brand-brown-muted">
            @{customer.username}
          </p>
        </div>

        <div aria-live="polite" className="min-h-0">
          {isSuccess ? (
            <p className="flex items-start justify-center gap-2 rounded-card border border-donut-matcha/40 bg-donut-matcha/10 px-4 py-3 text-sm text-donut-matcha-deep">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                1 poin berhasil ditambahkan. Saldo saat ini{" "}
                <span className="font-semibold tabular-nums">
                  {formatPoints(balance ?? 0)}
                </span>{" "}
                poin.
              </span>
            </p>
          ) : null}

          {isCooldown ? (
            <p className="flex items-start justify-center gap-2 rounded-card border border-warm-border bg-warm-neutral px-4 py-3 text-sm text-brand-brown-dark">
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                Pelanggan ini baru menerima poin. Tunggu{" "}
                <span className="font-semibold tabular-nums">
                  {remainingSeconds}
                </span>{" "}
                detik lagi.
              </span>
            </p>
          ) : null}

          {isError ? (
            <p
              role="alert"
              className="flex items-start justify-center gap-2 rounded-card border border-donut-berry/40 bg-donut-berry/10 px-4 py-3 text-sm text-donut-berry-deep"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>{message}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          {isSuccess ? (
            <Button
              type="button"
              onClick={close}
              autoFocus
              className="h-14 w-full text-base"
            >
              Selesai
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={
                  effectivePhase === "idle"
                    ? submit
                    : canRetry
                      ? submit
                      : close
                }
                disabled={isPending || isCooldown}
                className="h-14 w-full text-base"
              >
                {isPending ? (
                  <>
                    <LoaderCircle
                      aria-hidden
                      className="size-5 animate-spin motion-reduce:animate-none"
                    />
                    Menambah poin...
                  </>
                ) : isCooldown ? (
                  <>Tunggu {remainingSeconds} detik</>
                ) : isError && canRetry ? (
                  <>Coba lagi</>
                ) : isError ? (
                  <>Tutup</>
                ) : (
                  <>Tambah 1 Poin</>
                )}
              </Button>
              {isError && !canRetry ? null : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={isPending}
                  autoFocus={!isSuccess}
                  className="h-14 w-full text-base"
                >
                  Batal
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
