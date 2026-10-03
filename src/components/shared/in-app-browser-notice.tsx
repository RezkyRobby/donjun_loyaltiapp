"use client";

import { ExternalLink, TriangleAlert } from "lucide-react";

import { useInAppBrowser } from "@/components/shared/use-in-app-browser";

// Arahan "Buka di Browser" saat aplikasi dibuka dari in-app browser
// (Instagram/WhatsApp/TikTok, dsb.) yang membatasi kamera dan pemasangan PWA
// (PRD §9 Kompatibilitas Perangkat).
export function InAppBrowserNotice() {
  const { label, openUrl } = useInAppBrowser();

  if (!label) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-card border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-brown-dark"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-2">
        <p>
          Anda membuka halaman ini di dalam <strong>{label}</strong>. Kamera dan
          pemasangan aplikasi mungkin tidak berfungsi.
        </p>
        <p>
          Ketuk menu peramban, lalu pilih <strong>Buka di Browser</strong> untuk
          pengalaman terbaik.
        </p>
        {openUrl ? (
          <a
            href={openUrl}
            className="inline-flex items-center gap-1.5 font-medium text-brand-orange-deep underline"
          >
            <ExternalLink aria-hidden className="size-4" />
            Buka di Browser
          </a>
        ) : null}
      </div>
    </div>
  );
}
