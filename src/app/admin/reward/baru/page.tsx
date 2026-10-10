import type { Metadata } from "next";

import { RewardForm } from "@/components/admin/reward-form";
import { getAdminMenus } from "@/server/admin/menu-list";

export const metadata: Metadata = { title: "Tambah Reward" };

// Form pembuatan reward baru (PRD §5.3 fitur 2). Daftar menu dibawa untuk tipe
// manfaat voucher "Gratis 1 produk" (PRD §5.4 fitur 4).
export default async function AdminRewardCreatePage() {
  const menus = await getAdminMenus();

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
        <RewardForm
          mode="create"
          menus={menus.map((menu) => ({ id: menu.id, name: menu.name }))}
        />
      </div>
    </section>
  );
}
