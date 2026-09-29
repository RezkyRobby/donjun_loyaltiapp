// Util analitik terpusat (PRD §5.3 fitur 1). Logika deterministik dipisahkan
// dari kueri agar dapat diuji tanpa basis data; pembacaan data ada di
// `src/server/admin/analytics.ts`.

// Jumlah pelanggan teratas pada daftar "pelanggan paling loyal".
export const LOYAL_CUSTOMERS_LIMIT = 10;

// Membaca filter outlet dari query string. Mengembalikan id outlet yang valid
// sebagai string, atau `null` bila filter kosong/tidak ada — `null` berarti
// seluruh outlet (laporan lintas outlet).
export function parseOutletFilter(
  value: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();

  return trimmed ? trimmed : null;
}

// Rasio redemption bulanan (PRD §5.3 fitur 1): voucher terpakai dibagi voucher
// diterbitkan pada periode yang sama. Mengembalikan `null` bila belum ada
// voucher diterbitkan agar UI menampilkan tanda pisah, bukan 0% yang keliru.
export function computeRedemptionRate(
  usedCount: number,
  issuedCount: number,
): number | null {
  if (issuedCount <= 0) return null;

  return usedCount / issuedCount;
}
