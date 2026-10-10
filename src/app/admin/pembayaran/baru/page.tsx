import type { Metadata } from "next";

import { PaymentAccountForm } from "@/components/admin/payment-account-form";

export const metadata: Metadata = { title: "Tambah Rekening Pembayaran" };

// Form pembuatan rekening pembayaran baru (PRD §5.3 fitur 9).
export default function AdminPaymentAccountCreatePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Rekening Pembayaran
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat rekening tujuan transfer manual untuk pelanggan.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <PaymentAccountForm mode="create" />
      </div>
    </section>
  );
}
