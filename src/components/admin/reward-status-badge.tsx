import { CircleCheck, CircleSlash } from "lucide-react";

// Badge status aktif/nonaktif reward (design.md §8: status selalu ikon + teks,
// bukan warna saja).
export function RewardStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-donut-matcha/15 px-2.5 py-1 text-xs font-medium text-donut-matcha-deep">
        <CircleCheck aria-hidden className="size-3.5" />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-badge bg-warm-neutral px-2.5 py-1 text-xs font-medium text-brand-brown-muted">
      <CircleSlash aria-hidden className="size-3.5" />
      Nonaktif
    </span>
  );
}
