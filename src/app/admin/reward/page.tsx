import { Gift, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { RewardActions } from "@/components/admin/reward-actions";
import { RewardStatusBadge } from "@/components/admin/reward-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateWita } from "@/lib/datetime";
import { formatCount, formatPoints } from "@/lib/format";
import {
  getAdminRewards,
  type AdminReward,
} from "@/server/admin/reward-list";

export const metadata: Metadata = { title: "Manajemen Reward" };

// Manajemen katalog reward (PRD §5.3 fitur 2). Register *product* (design.md §2):
// tabel padat pada layar lebar (design.md §8: header sticky, baris 44px, angka
// tabular-nums, aksi eksplisit) dan kartu pada layar sempit agar tetap reflow.

function periodText(reward: AdminReward): string {
  if (reward.startAt && reward.endAt) {
    return `${formatDateWita(reward.startAt)} sampai ${formatDateWita(reward.endAt)}`;
  }
  if (reward.startAt) return `Mulai ${formatDateWita(reward.startAt)}`;
  if (reward.endAt) return `Sampai ${formatDateWita(reward.endAt)}`;

  return "Tanpa batas waktu";
}

function quotaText(reward: AdminReward): string {
  if (reward.quota === null) return "Tidak terbatas";

  return `${formatCount(reward.claimedCount)} / ${formatCount(reward.quota)}`;
}

function perUserLimitText(reward: AdminReward): string {
  if (reward.perUserLimit === null) return "Tidak terbatas";

  return `${formatCount(reward.perUserLimit)} kali`;
}

function RewardThumbnail({ reward }: { reward: AdminReward }) {
  if (!reward.imageUrl) {
    return (
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-button bg-warm-neutral text-brand-brown-muted"
      >
        <Gift className="size-5" />
      </span>
    );
  }

  return (
    <Image
      src={reward.imageUrl}
      alt={`Gambar promo ${reward.title}`}
      width={64}
      height={48}
      className="h-12 w-16 shrink-0 rounded-button border border-border object-cover"
    />
  );
}

export default async function AdminRewardPage() {
  const rewards = await getAdminRewards();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Manajemen Reward
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Kelola promo, kuota, limit klaim per pelanggan, periode, dan Syarat
            &amp; Ketentuan.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/reward/baru">
            <Plus aria-hidden className="size-4" />
            Tambah reward
          </Link>
        </Button>
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Gift className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada reward
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Buat promo pertama agar pelanggan dapat menukarkan poin mereka.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/reward/baru">
              <Plus aria-hidden className="size-4" />
              Tambah reward
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Tabel padat untuk layar lebar (design.md §10: 1024px+). */}
          <div className="hidden overflow-hidden rounded-card border border-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Promo
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Poin
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kuota terpakai
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Batas/pelanggan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Periode
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="h-14 align-middle">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <RewardThumbnail reward={reward} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-brown-dark">
                            {reward.title}
                          </p>
                          {reward.description ? (
                            <p className="max-w-xs truncate text-xs text-brand-brown-muted">
                              {reward.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatPoints(reward.pointsCost)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {quotaText(reward)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {perUserLimitText(reward)}
                    </td>
                    <td className="px-4 py-2 text-brand-brown-muted">
                      {periodText(reward)}
                    </td>
                    <td className="px-4 py-2">
                      <RewardStatusBadge isActive={reward.isActive} />
                    </td>
                    <td className="px-4 py-2">
                      <RewardActions
                        id={reward.id}
                        isActive={reward.isActive}
                        canDelete={reward.claimedCount === 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu untuk layar sempit agar konten tetap reflow (design.md §11). */}
          <ul className="flex flex-col gap-4 lg:hidden">
            {rewards.map((reward) => (
              <li
                key={reward.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <RewardThumbnail reward={reward} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-brown-dark">
                      {reward.title}
                    </p>
                    <RewardStatusBadge isActive={reward.isActive} />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-brand-brown-muted">Biaya poin</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatPoints(reward.pointsCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Kuota terpakai</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {quotaText(reward)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Batas/pelanggan</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {perUserLimitText(reward)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Periode</dt>
                    <dd className="text-brand-brown-dark">
                      {periodText(reward)}
                    </dd>
                  </div>
                </dl>
                <RewardActions
                  id={reward.id}
                  isActive={reward.isActive}
                  canDelete={reward.claimedCount === 0}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
