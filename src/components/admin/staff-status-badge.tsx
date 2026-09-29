import { CircleCheck, CircleSlash, Clock } from "lucide-react";

// Badge status akun staf (design.md §8: status selalu ikon + teks, bukan warna
// saja). Kasir yang belum menetapkan kata sandi ditandai "Menunggu aktivasi".
export function StaffStatusBadge({
  isActive,
  activated,
}: {
  isActive: boolean;
  activated: boolean;
}) {
  if (!activated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-sky-pastel/70 px-2.5 py-1 text-xs font-medium text-brand-brown-dark">
        <Clock aria-hidden className="size-3.5" />
        Menunggu aktivasi
      </span>
    );
  }

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
