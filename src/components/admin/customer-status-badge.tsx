import { CircleCheck, CircleSlash } from "lucide-react";

// Badge status akun pelanggan (design.md §8: status selalu ikon + teks, bukan
// warna saja). Akun yang ditangguhkan tidak dapat login atau menerima poin baru
// (PRD §5.3 fitur 5).
export function CustomerStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-donut-matcha/15 px-2.5 py-1 text-xs font-medium text-donut-matcha-deep">
        <CircleCheck aria-hidden className="size-3.5" />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-badge bg-donut-berry/15 px-2.5 py-1 text-xs font-medium text-donut-berry-deep">
      <CircleSlash aria-hidden className="size-3.5" />
      Ditangguhkan
    </span>
  );
}
