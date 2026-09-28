import type { Metadata } from "next";

import { ScanPanel } from "@/components/kasir/scan-panel";

export const metadata: Metadata = { title: "Scan QR" };

// Rute pemindaian identitas dan injeksi poin (PRD Lampiran B: /kasir/scan).
// Memuat viewport kamera dengan validasi payload versi, input username manual
// sebagai fallback, dan pop-up konfirmasi tambah poin (PRD §5.2 fitur 1–3, §8.3).
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
