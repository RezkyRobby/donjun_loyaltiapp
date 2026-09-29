// Pemformatan angka terpusat (AGENTS.md: tanggal & angka diformat lewat util
// terpusat dengan locale id-ID, bukan formatting ad-hoc). Formatter dibuat
// sekali di tingkat modul karena Intl.NumberFormat relatif mahal untuk dibuat
// berulang.

const numberFormatter = new Intl.NumberFormat("id-ID");

const percentFormatter = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
});

// Bilangan bulat dengan pemisah ribuan id-ID, mis. jumlah anggota atau voucher.
export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

// Saldo poin ditampilkan dengan pemisah ribuan id-ID (design.md §5).
export function formatPoints(value: number): string {
  return numberFormatter.format(value);
}

// Rasio ditampilkan sebagai persen id-ID, mis. 0,5 → "50%". Nilai `null`
// berarti rasio belum dapat dihitung (mis. belum ada voucher diterbitkan) dan
// ditampilkan sebagai tanda pisah, bukan "0%" yang menyesatkan.
export function formatPercent(value: number | null): string {
  if (value === null) return "—";

  return percentFormatter.format(value);
}
