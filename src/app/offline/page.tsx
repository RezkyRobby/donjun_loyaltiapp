"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";

// Halaman fallback offline (NFR §9). Ditampilkan service worker saat navigasi
// gagal dan tidak ada dokumen tersimpan untuk rute tersebut.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
      >
        <WifiOff className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Anda sedang offline
        </h1>
        <p className="max-w-[60ch] text-sm text-brand-brown-muted">
          Halaman ini membutuhkan koneksi internet. Periksa jaringan Anda, lalu
          coba lagi.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-12 items-center gap-2 rounded-button bg-brand-orange px-6 font-medium text-brand-brown-dark"
        >
          <RefreshCw aria-hidden className="size-5" />
          Coba lagi
        </button>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-orange-deep underline"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
