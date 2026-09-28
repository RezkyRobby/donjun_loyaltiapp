import type { Metadata } from "next";

import { ValidateVoucherPanel } from "@/components/kasir/validate-voucher-panel";

export const metadata: Metadata = { title: "Validasi Voucher" };

// Rute validasi voucher (PRD Lampiran B: /kasir/validasi). Pemindaian barcode
// Code 128 atau input kode manual dengan pembaruan status atomik dan notifikasi
// hijau/merah (PRD §5.2 fitur 4–5, §8.4).
export default function KasirValidasiPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Validasi Voucher
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Pindai barcode voucher pelanggan atau masukkan kode secara manual.
        </p>
      </div>
      <ValidateVoucherPanel />
    </section>
  );
}
