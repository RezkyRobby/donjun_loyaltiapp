import { Gift } from "lucide-react";
import type { Metadata } from "next";

import { RewardCard } from "@/components/customer/reward-card";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerRewardCatalog } from "@/server/rewards/catalog";

export const metadata: Metadata = { title: "Promo" };

// Katalog promo pelanggan (PRD §5.1 fitur 5). Menampilkan reward aktif beserta
// sisa kuota, limit per pelanggan, periode, dan S&K; tombol klaim nonaktif saat
// syarat penukaran belum terpenuhi.
export default async function CustomerPromoPage() {
  const session = await requireCustomer();
  const rewards = await getCustomerRewardCatalog(session.user.id);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Promo
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Tukarkan poin Anda dengan promo berikut. Semua promo berlaku di
          seluruh outlet Donjun Donat.
        </p>
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-6 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Gift className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada promo
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Saat ini belum ada promo yang dapat ditukarkan. Nantikan promo
            menarik dari Donjun Donat.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rewards.map((reward) => (
            <li key={reward.id}>
              <RewardCard reward={reward} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
