import type { Metadata } from "next";

import { RewardForm } from "@/components/admin/reward-form";

export const metadata: Metadata = { title: "Tambah Reward" };

// Form pembuatan reward baru (PRD §5.3 fitur 2).
export default function AdminRewardCreatePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Reward
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat promo baru untuk katalog penukaran poin pelanggan.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <RewardForm mode="create" />
      </div>
    </section>
  );
}
