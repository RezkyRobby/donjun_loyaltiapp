"use client";

import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/components/shared/use-online-status";

// Indikator status jaringan (NFR §9 PWA & Mode Offline). Hanya menampilkan
// banner saat koneksi terputus. Status dibawa oleh ikon dan teks, bukan warna
// saja (design.md §11).
export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-warm-border bg-card px-4 py-2 text-xs font-medium text-donut-berry-deep shadow-raised"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      <span>Tidak ada koneksi. Menampilkan data tersimpan.</span>
    </p>
  );
}
