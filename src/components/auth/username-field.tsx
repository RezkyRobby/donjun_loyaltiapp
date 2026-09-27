"use client";

import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isReservedUsername } from "@/constants/reserved-usernames";
import { isValidUsernameFormat } from "@/lib/username";
import { cn } from "@/lib/utils";

type UsernameCheck = {
  value: string;
  available: boolean;
  message: string;
};

export type UsernameFieldProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  onAvailabilityChange: (available: boolean | null) => void;
  error?: string;
};

// Jeda debounce sesuai PRD Lampiran A.3 (±400 ms) agar pengecekan tidak
// membanjiri endpoint saat pengguna mengetik.
const DEBOUNCE_MS = 400;
const HINT =
  "8 sampai 20 karakter, diawali huruf, hanya huruf kecil, angka, titik, atau garis bawah.";

// Input username dengan validasi real-time format lokal + ketersediaan dari
// endpoint khusus (PRD §5.1 fitur 2 & Lampiran A.3).
export function UsernameField({
  id,
  value,
  onValueChange,
  onAvailabilityChange,
  error,
}: UsernameFieldProps) {
  const [check, setCheck] = useState<UsernameCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
  }, []);

  function runCheck(normalized: string) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    fetch(`/api/username/cek?username=${encodeURIComponent(normalized)}`, {
      signal: controller.signal,
    })
      .then(
        async (response) =>
          (await response.json()) as { available: boolean; message: string },
      )
      .then((body) => {
        if (requestId !== requestIdRef.current) return;

        setCheck({
          value: normalized,
          available: body.available,
          message: body.message,
        });
        onAvailabilityChange(body.available);
      })
      .catch(() => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setCheck({
          value: normalized,
          available: false,
          message: "Gagal memeriksa username. Periksa koneksi lalu coba lagi.",
        });
        onAvailabilityChange(null);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsChecking(false);
      });
  }

  function handleChange(next: string) {
    onValueChange(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();

    const normalized = next.trim().toLowerCase();
    const locallyInvalid =
      normalized.length > 0 &&
      (!isValidUsernameFormat(normalized) || isReservedUsername(normalized));

    if (!normalized || locallyInvalid) {
      setCheck(null);
      setIsChecking(false);
      onAvailabilityChange(locallyInvalid ? false : null);
      return;
    }

    setIsChecking(true);
    timerRef.current = setTimeout(() => runCheck(normalized), DEBOUNCE_MS);
  }

  const normalized = value.trim().toLowerCase();
  const settled = check && check.value === normalized ? check : null;

  let tone: "muted" | "success" | "error" = "muted";
  let message = HINT;
  let Icon = null;

  if (error) {
    tone = "error";
    message = error;
    Icon = TriangleAlert;
  } else if (normalized && !isValidUsernameFormat(normalized)) {
    tone = "error";
    message = HINT;
    Icon = TriangleAlert;
  } else if (normalized && isReservedUsername(normalized)) {
    tone = "error";
    message = "Username mengandung kata yang tidak diizinkan.";
    Icon = TriangleAlert;
  } else if (normalized && (isChecking || !settled)) {
    tone = "muted";
    message = "Memeriksa ketersediaan username...";
    Icon = LoaderCircle;
  } else if (settled?.available) {
    tone = "success";
    message = settled.message;
    Icon = Check;
  } else if (settled) {
    tone = "error";
    message = settled.message;
    Icon = TriangleAlert;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Username</Label>
      <Input
        id={id}
        name={id}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={tone === "error" ? true : undefined}
        aria-describedby={`${id}-pesan`}
        required
        className="h-12 bg-card"
      />
      <p
        id={`${id}-pesan`}
        aria-live="polite"
        className={cn(
          "flex items-start gap-1.5 text-xs",
          tone === "error" && "text-donut-berry-deep",
          tone === "success" && "text-donut-matcha-deep",
          tone === "muted" && "text-brand-brown-muted",
        )}
      >
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              "mt-0.5 size-3.5 shrink-0",
              tone === "muted" && "animate-spin",
            )}
          />
        ) : null}
        <span>{message}</span>
      </p>
    </div>
  );
}
