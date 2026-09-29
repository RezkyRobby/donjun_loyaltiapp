import type { Metadata } from "next";

import { OutletForm } from "@/components/admin/outlet-form";

export const metadata: Metadata = { title: "Tambah Outlet" };

// Form pembuatan outlet baru (PRD §5.3 fitur 6).
export default function AdminOutletCreatePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Outlet
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat data outlet baru beserta alamat dan kontaknya.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <OutletForm mode="create" />
      </div>
    </section>
  );
}
