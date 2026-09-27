// Pemformatan angka terpusat (AGENTS.md: tanggal & angka diformat lewat util
// terpusat dengan locale id-ID, bukan formatting ad-hoc). Formatter dibuat
// sekali di tingkat modul karena Intl.NumberFormat relatif mahal untuk dibuat
// berulang.

const pointsFormatter = new Intl.NumberFormat("id-ID");

// Saldo poin ditampilkan dengan pemisah ribuan id-ID (design.md §5).
export function formatPoints(value: number): string {
  return pointsFormatter.format(value);
}
