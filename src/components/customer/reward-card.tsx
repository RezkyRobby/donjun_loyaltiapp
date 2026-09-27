import { Gift, Info } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { REWARD_UNAVAILABLE_REASON_LABELS } from "@/constants/labels";
import { formatDateWita } from "@/lib/datetime";
import { formatPoints } from "@/lib/format";
import type { CatalogReward } from "@/server/rewards/catalog";

// Masa berlaku promo ditampilkan dalam WITA (PRD §9). "Sampai" dipakai sebagai
// kata rentang agar tidak memakai em dash (design.md §5).
function formatPeriod(startAt: Date | null, endAt: Date | null): string {
  if (startAt && endAt) {
    return `${formatDateWita(startAt)} sampai ${formatDateWita(endAt)}`;
  }
  if (startAt) return `Mulai ${formatDateWita(startAt)}`;
  if (endAt) return `Berlaku sampai ${formatDateWita(endAt)}`;

  return "Tanpa batas waktu";
}

// Kartu promo pada katalog pelanggan (PRD §5.1 fitur 5). Tombol klaim otomatis
// nonaktif beserta alasan bila poin belum cukup, kuota habis, limit per
// pelanggan tercapai, atau di luar periode aktif. Aksi penukaran disambungkan
// pada Task 14.
export function RewardCard({ reward }: { reward: CatalogReward }) {
  const { availability } = reward;
  const reasonId = `alasan-${reward.id}`;

  const remainingQuotaText =
    availability.remainingQuota === null
      ? "Tidak terbatas"
      : `${formatPoints(availability.remainingQuota)} voucher`;

  const perUserLimitText =
    reward.perUserLimit === null
      ? "Tidak terbatas"
      : `${formatPoints(reward.perUserLimit)} kali`;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-warm-border bg-card shadow-card">
      <div className="relative aspect-[4/3] bg-warm-neutral">
        {reward.imageUrl ? (
          <Image
            src={reward.imageUrl}
            alt={`Gambar promo ${reward.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full items-center justify-center text-brand-brown-muted"
          >
            <Gift className="size-10" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-brown-dark">
            {reward.title}
          </h3>
          <span className="shrink-0 rounded-badge bg-brand-orange px-3 py-1 text-sm font-semibold tabular-nums text-brand-brown-dark">
            {formatPoints(reward.pointsCost)} Poin
          </span>
        </div>

        {reward.description ? (
          <p className="text-sm text-brand-brown-muted">{reward.description}</p>
        ) : null}

        <dl className="flex flex-col gap-1 border-t border-warm-border pt-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-brand-brown-muted">Sisa kuota</dt>
            <dd className="font-medium tabular-nums text-brand-brown-dark">
              {remainingQuotaText}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-brand-brown-muted">Batas per pelanggan</dt>
            <dd className="font-medium tabular-nums text-brand-brown-dark">
              {perUserLimitText}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-brand-brown-muted">Masa berlaku</dt>
            <dd className="text-right font-medium text-brand-brown-dark">
              {formatPeriod(reward.startAt, reward.endAt)}
            </dd>
          </div>
        </dl>

        {reward.terms ? (
          <details className="rounded-button border border-warm-border bg-warm-neutral/60 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-brand-brown-dark">
              Syarat &amp; Ketentuan
            </summary>
            <p className="mt-2 text-sm text-brand-brown-muted">
              {reward.terms}
            </p>
          </details>
        ) : null}

        <Button
          type="button"
          disabled={!availability.canRedeem}
          aria-describedby={availability.reason ? reasonId : undefined}
          className="h-12 w-full"
        >
          Tukar poin
        </Button>

        {!availability.canRedeem && availability.reason ? (
          <p
            id={reasonId}
            className="flex items-center justify-center gap-2 text-sm text-brand-brown-muted"
          >
            <Info aria-hidden className="size-4 shrink-0" />
            <span>{REWARD_UNAVAILABLE_REASON_LABELS[availability.reason]}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
