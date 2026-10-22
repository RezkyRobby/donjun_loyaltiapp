import { CircleCheck, CircleSlash } from "lucide-react";

// Badge status aktif/nonaktif generik untuk entitas backoffice (kategori menu,
// menu, rekening pembayaran). design.md §8: status selalu ikon + teks, bukan
// warna saja.
export function ActiveStatusBadge({
  isActive,
  activeLabel = "Aktif",
  inactiveLabel = "Nonaktif",
}: {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-donut-matcha/15 px-2.5 py-1 text-caption font-medium text-donut-matcha-deep">
        <CircleCheck aria-hidden className="size-3.5" />
        {activeLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-badge bg-warm-neutral px-2.5 py-1 text-caption font-medium text-brand-brown-muted">
      <CircleSlash aria-hidden className="size-3.5" />
      {inactiveLabel}
    </span>
  );
}
