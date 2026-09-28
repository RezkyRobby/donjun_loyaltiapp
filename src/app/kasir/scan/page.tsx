import type { Metadata } from "next";

import { ScanPanel } from "@/components/kasir/scan-panel";

export const metadata: Metadata = { title: "Scan QR" };

// Rute pemindaian QR akun pelanggan (PRD Lampiran B: /kasir/scan). Memuat
// viewport kamera dan validasi payload versi (PRD §5.2 fitur 1, §8.3). Input
// username manual ditambahkan pada Task 19 dan injeksi poin pada Task 20.
export default function KasirScanPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Scan QR
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Pindai QR Code akun pelanggan untuk menambahkan 1 poin per transaksi.
        </p>
      </div>
      <ScanPanel />
    </section>
  );
}
