import { TicketCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Validasi Voucher" };

// Rute validasi voucher (PRD Lampiran B: /kasir/validasi). Kerangka halaman
// disiapkan pada shell kasir (Task 17); pemindaian barcode, input kode manual,
// dan pembaruan status atomik diimplementasikan pada Task 21.
export default function KasirValidasiPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Validasi Voucher
      </h1>
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
        >
          <TicketCheck className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
          Validasi segera hadir
        </h2>
        <p className="text-sm text-brand-brown-muted">
          Pemindaian barcode dan input kode voucher manual sedang disiapkan.
        </p>
      </div>
    </section>
  );
}
