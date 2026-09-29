import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RewardForm } from "@/components/admin/reward-form";
import { witaDayKey } from "@/lib/datetime";
import { getAdminRewardById } from "@/server/admin/reward-list";

export const metadata: Metadata = { title: "Ubah Reward" };

// Form perubahan reward (PRD §5.3 fitur 2). Periode ditampilkan sebagai tanggal
// kalender WITA agar konsisten dengan input admin.
export default async function AdminRewardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reward = await getAdminRewardById(id);

  if (!reward) notFound();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Ubah Reward
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Perbarui detail promo. Perubahan berlaku untuk penukaran berikutnya;
          voucher yang sudah terbit tetap utuh.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <RewardForm
          mode="edit"
          initial={{
            id: reward.id,
            title: reward.title,
            description: reward.description ?? "",
            pointsCost: String(reward.pointsCost),
            quota: reward.quota === null ? "" : String(reward.quota),
            perUserLimit:
              reward.perUserLimit === null ? "" : String(reward.perUserLimit),
            startAt: reward.startAt ? witaDayKey(reward.startAt) : "",
            endAt: reward.endAt ? witaDayKey(reward.endAt) : "",
            terms: reward.terms ?? "",
            isActive: reward.isActive,
            imageUrl: reward.imageUrl,
          }}
        />
      </div>
    </section>
  );
}
