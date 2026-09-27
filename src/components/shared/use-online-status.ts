"use client";

import { useSyncExternalStore } from "react";

// Status koneksi peramban (NFR §9 PWA & Mode Offline). Dipakai bersama oleh
// banner koneksi global dan kartu QR/saldo agar tidak ada duplikasi logika
// langganan event.
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

// Saat server/hidrasi, anggap daring agar indikator tidak berkedip sebelum
// status koneksi sebenarnya diketahui.
function getServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkSnapshot,
    getServerSnapshot,
  );
}
