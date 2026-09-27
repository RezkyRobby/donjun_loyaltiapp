"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

// Indikator status jaringan (NFR §9 PWA & Mode Offline). Berlangganan langsung
// ke event `online`/`offline` peramban lewat useSyncExternalStore, lalu hanya
// menampilkan banner saat koneksi terputus. Status dibawa oleh ikon dan teks,
// bukan warna saja (design.md §11).
function subscribeToNetworkStatus(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getNetworkSnapshot() {
  return navigator.onLine;
}

// Saat server/hidrasi, anggap daring agar banner tidak berkedip sebelum status
// koneksi sebenarnya diketahui.
function getServerSnapshot() {
  return true;
}

export function ConnectionStatus() {
  const isOnline = useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkSnapshot,
    getServerSnapshot,
  );

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
