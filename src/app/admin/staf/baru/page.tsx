import type { Metadata } from "next";

import { StaffForm } from "@/components/admin/staff-form";
import { getOutletOptions } from "@/server/admin/analytics";

export const metadata: Metadata = { title: "Tambah Staf" };

// Form pembuatan akun kasir (PRD §5.3 fitur 4, §8.6). Sistem mengirim undangan
// aktivasi; kasir menetapkan kata sandinya sendiri lewat tautan bertoken.
export default async function AdminStaffCreatePage() {
  const outlets = await getOutletOptions();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Staf
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat akun kasir baru beserta penugasan outletnya.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <StaffForm outlets={outlets} />
      </div>
    </section>
  );
}
