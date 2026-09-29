import { AUDIT_ACTION, type AuditAction } from "@/constants/audit";
import {
  AUDIT_ACTION_LABELS,
  POINT_TRANSACTION_METHOD_LABELS,
  POINT_TRANSACTION_TYPE_LABELS,
} from "@/constants/labels";
import { PointTransactionType } from "@/generated/prisma/enums";
import {
  parseWitaDateEndInclusive,
  parseWitaDateStart,
  witaDayKey,
} from "@/lib/datetime";

// Utilitas Audit Log Menyeluruh (PRD §5.3 fitur 3): penggabungan jejak transaksi
// poin (PointTransaction) dengan aksi administratif (AuditLog), pemfilteran
// (tanggal, outlet, kasir/pelaku, tipe aksi), dan pembentukan tautan. Logika di
// sini deterministik dan diuji tanpa basis data; pembacaan data ada di
// `src/server/admin/audit-log.ts`.

export type AuditLogSource = "POINT" | "ADMIN";

// Tipe aksi gabungan: jenis transaksi poin (EARN/REDEEM/ADJUST/REVERSAL) dan
// aksi administratif (AUDIT_ACTION). Dipakai sebagai daftar putih filter agar
// nilai dinamis tidak pernah masuk ke kueri secara bebas (AGENTS.md aturan 2).
export const AUDIT_POINT_ACTIONS = Object.values(
  PointTransactionType,
) as PointTransactionType[];

export const AUDIT_ADMIN_ACTIONS = Object.values(AUDIT_ACTION) as AuditAction[];

export type AuditLogAction = PointTransactionType | AuditAction;

export function isPointAction(value: string): value is PointTransactionType {
  return (AUDIT_POINT_ACTIONS as string[]).includes(value);
}

export function isAdminAction(value: string): value is AuditAction {
  return (AUDIT_ADMIN_ACTIONS as string[]).includes(value);
}

export function isAuditLogAction(value: string): value is AuditLogAction {
  return isPointAction(value) || isAdminAction(value);
}

// Label aksi gabungan untuk tampilan dan ekspor CSV.
export function getAuditActionLabel(action: AuditLogAction | string): string {
  if (isPointAction(action)) return POINT_TRANSACTION_TYPE_LABELS[action];
  if (isAdminAction(action)) return AUDIT_ACTION_LABELS[action];

  return action;
}

// Label metode input transaksi poin (scan QR, input username, dst.).
export function getAuditMethodLabel(method: string | null): string {
  if (!method) return "";

  return (
    (POINT_TRANSACTION_METHOD_LABELS as Record<string, string>)[method] ?? method
  );
}

// Satu baris Audit Log yang sudah dinormalkan dari kedua sumber. Kolom yang tidak
// relevan untuk suatu sumber bernilai null.
export type AuditLogEntry = {
  id: string;
  source: AuditLogSource;
  createdAt: Date;
  actionKey: AuditLogAction;
  amount: number | null;
  method: string | null;
  outletId: string | null;
  outletName: string | null;
  actorId: string | null;
  actorName: string | null;
  customerName: string | null;
  customerUsername: string | null;
  voucherCode: string | null;
  note: string | null;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
};

export type AuditLogFilters = {
  from: Date | null;
  to: Date | null;
  outletId: string | null;
  actorId: string | null;
  action: AuditLogAction | null;
};

export type AuditLogFilterInput = {
  from: string;
  to: string;
  outletId: string;
  actorId: string;
  action: string;
};

export type AuditLogSearchParams = Record<
  string,
  string | string[] | undefined
>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_MAX_LENGTH = 64;

// Batas halaman yang dapat dipindai saat menggabungkan dua sumber. Menjaga
// kueri tetap wajar tanpa mengubah kebenaran halaman-halaman awal.
export const MAX_AUDIT_PAGE = 200;

// Batas baris ekspor CSV agar unduhan tidak menghabiskan memori.
export const AUDIT_EXPORT_LIMIT = 5000;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function normalizeId(value: string): string | null {
  return value.length > 0 && value.length <= ID_MAX_LENGTH ? value : null;
}

// Tanggal kalender WITA (`yyyy-MM-dd`) menjadi instant UTC. Tanggal yang tidak
// valid (mis. 2026-02-30) ditolak dengan pemeriksaan bolak-balik hari WITA.
function parseDateKey(value: string, endInclusive: boolean): Date | null {
  if (!DATE_PATTERN.test(value)) return null;

  const parsed = endInclusive
    ? parseWitaDateEndInclusive(value)
    : parseWitaDateStart(value);

  if (Number.isNaN(parsed.getTime())) return null;
  if (witaDayKey(parsed) !== value) return null;

  return parsed;
}

// Membaca filter dari query string. Nilai yang tidak valid diabaikan (dianggap
// tidak diisi) sehingga halaman tetap dapat dirender.
export function parseAuditLogFilters(
  params: AuditLogSearchParams,
): AuditLogFilters {
  const action = firstParam(params.aksi);

  return {
    from: parseDateKey(firstParam(params.dari), false),
    to: parseDateKey(firstParam(params.sampai), true),
    outletId: normalizeId(firstParam(params.outlet)),
    actorId: normalizeId(firstParam(params.pelaku)),
    action: isAuditLogAction(action) ? action : null,
  };
}

// Nilai filter untuk ditampilkan kembali pada form.
export function toAuditLogFilterInput(
  filters: AuditLogFilters,
): AuditLogFilterInput {
  return {
    from: filters.from ? witaDayKey(filters.from) : "",
    to: filters.to ? witaDayKey(filters.to) : "",
    outletId: filters.outletId ?? "",
    actorId: filters.actorId ?? "",
    action: filters.action ?? "",
  };
}

// Query string filter untuk navigasi halaman dan ekspor CSV.
export function buildAuditLogQueryString(filters: AuditLogFilters): string {
  const search = new URLSearchParams();

  if (filters.from) search.set("dari", witaDayKey(filters.from));
  if (filters.to) search.set("sampai", witaDayKey(filters.to));
  if (filters.outletId) search.set("outlet", filters.outletId);
  if (filters.actorId) search.set("pelaku", filters.actorId);
  if (filters.action) search.set("aksi", filters.action);

  return search.toString();
}

// Menggabungkan dua daftar yang masing-masing sudah terurut menurun berdasarkan
// waktu, lalu mengambil satu halaman. Untuk halaman N, pemanggil mengambil
// `N * pageSize` baris teratas dari tiap sumber sehingga hasil gabungannya pasti
// memuat halaman yang diminta (teknik top-K union dua daftar terurut).
export function mergeAuditLogEntries(
  pointEntries: AuditLogEntry[],
  adminEntries: AuditLogEntry[],
  page: number,
  pageSize: number,
): AuditLogEntry[] {
  const merged = [...pointEntries, ...adminEntries].sort((a, b) => {
    const byTime = b.createdAt.getTime() - a.createdAt.getTime();
    if (byTime !== 0) return byTime;
    if (a.id === b.id) return 0;

    return a.id < b.id ? 1 : -1;
  });

  const start = (Math.max(page, 1) - 1) * pageSize;

  return merged.slice(start, start + pageSize);
}
