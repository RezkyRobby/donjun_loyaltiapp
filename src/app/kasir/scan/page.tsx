import { ScanLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Scan QR" };

// Rute pemindaian QR akun pelanggan (PRD Lampiran B: /kasir/scan). Kerangka
// halaman disiapkan pada shell kasir (Task 17); pemindai kamera, pop-up
// konfirmasi, dan injeksi poin diimplementasikan pada Task 18–20.
export default function KasirScanPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Scan QR
      </h1>
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
        >
          <ScanLine className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
          Pemindai segera hadir
        </h2>
        <p className="text-sm text-brand-brown-muted">
          Pemindaian QR Code akun dan input username pelanggan sedang disiapkan.
        </p>
      </div>
    </section>
  );
}
