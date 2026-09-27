"use client";

import { useEffect } from "react";

import { SERVICE_WORKER_PATH } from "@/lib/pwa";

// Mendaftarkan service worker PWA pelanggan (NFR §9 PWA & Mode Offline).
// Pendaftaran hanya di produksi agar cache tidak mengganggu pengembangan (HMR)
// dan respons berisi data sesi tidak tersimpan selama dev.
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch(() => {
      // Kegagalan pendaftaran tidak boleh mengganggu penggunaan aplikasi.
    });
  }, []);

  return null;
}
