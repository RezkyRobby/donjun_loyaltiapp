// Paginasi server-side terpusat (NFR §9: default 50 baris per halaman untuk
// seluruh daftar data). Parameter halaman divalidasi agar tidak pernah negatif.
export const DEFAULT_PAGE_SIZE = 50;

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) return 1;

  return parsed;
}

export function pageOffset(page: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return (Math.max(page, 1) - 1) * pageSize;
}
