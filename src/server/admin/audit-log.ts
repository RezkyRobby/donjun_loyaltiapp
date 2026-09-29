import type { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import {
  AUDIT_EXPORT_LIMIT,
  MAX_AUDIT_PAGE,
  isAdminAction,
  isPointAction,
  mergeAuditLogEntries,
  type AuditLogAction,
  type AuditLogEntry,
  type AuditLogFilters,
} from "@/lib/audit-log";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

// Kueri Audit Log Menyeluruh (PRD §5.3 fitur 3). Jejak digabung dari dua sumber:
// `PointTransaction` (injeksi/penukaran/koreksi poin — memuat kasir & outlet)
// dan `AuditLog` (aksi administratif backoffice). Filter tanggal, outlet,
// kasir/pelaku, dan tipe aksi divalidasi lewat daftar putih (AGENTS.md aturan 2)
// memakai Prisma Client berparameter; tidak ada SQL mentah.

export type AuditLogPage = {
  entries: AuditLogEntry[];
  page: number;
  totalPages: number;
  total: number;
};

export type AuditOutletOption = {
  id: string;
  name: string;
};

export type AuditActorOption = {
  id: string;
  name: string;
  role: UserRole;
};

type AuditSources = {
  points: boolean;
  admin: boolean;
};

const POINT_SELECT = {
  id: true,
  type: true,
  amount: true,
  method: true,
  createdAt: true,
  outletId: true,
  cashierId: true,
  note: true,
  outlet: { select: { name: true } },
  cashier: { select: { name: true } },
  customer: { select: { name: true, username: true } },
  voucher: { select: { voucherCode: true } },
} satisfies Prisma.PointTransactionSelect;

type PointRow = Prisma.PointTransactionGetPayload<{
  select: typeof POINT_SELECT;
}>;

const ADMIN_SELECT = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actorId: true,
  actor: { select: { name: true } },
} satisfies Prisma.AuditLogSelect;

type AdminRow = Prisma.AuditLogGetPayload<{ select: typeof ADMIN_SELECT }>;

function toPointEntry(row: PointRow): AuditLogEntry {
  return {
    id: row.id,
    source: "POINT",
    createdAt: row.createdAt,
    actionKey: row.type,
    amount: row.amount,
    method: row.method,
    outletId: row.outletId,
    outletName: row.outlet?.name ?? null,
    actorId: row.cashierId,
    actorName: row.cashier?.name ?? null,
    customerName: row.customer?.name ?? null,
    customerUsername: row.customer?.username ?? null,
    voucherCode: row.voucher?.voucherCode ?? null,
    note: row.note,
    entity: "PointTransaction",
    entityId: row.id,
    metadata: null,
  };
}

function toAdminEntry(row: AdminRow): AuditLogEntry {
  return {
    id: row.id,
    source: "ADMIN",
    createdAt: row.createdAt,
    actionKey: row.action as AuditLogAction,
    amount: null,
    method: null,
    outletId: null,
    outletName: null,
    actorId: row.actorId,
    actorName: row.actor?.name ?? null,
    customerName: null,
    customerUsername: null,
    voucherCode: null,
    note: null,
    entity: row.entity,
    entityId: row.entityId,
    metadata: row.metadata,
  };
}

// Rentang waktu opsional untuk kedua sumber.
function dateRange(
  filters: AuditLogFilters,
): { gte?: Date; lte?: Date } | undefined {
  if (!filters.from && !filters.to) return undefined;

  const range: { gte?: Date; lte?: Date } = {};
  if (filters.from) range.gte = filters.from;
  if (filters.to) range.lte = filters.to;

  return range;
}

// Aksi administratif tidak terikat outlet; bila filter outlet aktif, hanya
// transaksi poin yang ditampilkan. Filter tipe aksi mempersempit ke satu sumber.
function resolveSources(filters: AuditLogFilters): AuditSources {
  if (filters.action) {
    return isPointAction(filters.action)
      ? { points: true, admin: false }
      : { points: false, admin: true };
  }

  if (filters.outletId) return { points: true, admin: false };

  return { points: true, admin: true };
}

function pointWhere(
  filters: AuditLogFilters,
): Prisma.PointTransactionWhereInput {
  const where: Prisma.PointTransactionWhereInput = {};
  const range = dateRange(filters);

  if (range) where.createdAt = range;
  if (filters.action && isPointAction(filters.action)) where.type = filters.action;
  if (filters.outletId) where.outletId = filters.outletId;
  if (filters.actorId) where.cashierId = filters.actorId;

  return where;
}

function adminWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  const range = dateRange(filters);

  if (range) where.createdAt = range;
  if (filters.action && isAdminAction(filters.action)) where.action = filters.action;
  if (filters.actorId) where.actorId = filters.actorId;

  return where;
}

export async function getAuditLogEntries(
  filters: AuditLogFilters,
  page = 1,
): Promise<AuditLogPage> {
  const safePage = Math.min(Math.max(page, 1), MAX_AUDIT_PAGE);
  // Untuk halaman N, ambil N halaman teratas dari tiap sumber lalu gabungkan
  // (teknik top-K) agar paginasi lintas sumber tetap akurat.
  const scanLimit = safePage * DEFAULT_PAGE_SIZE;
  const sources = resolveSources(filters);
  const point = pointWhere(filters);
  const admin = adminWhere(filters);

  const [pointTotal, adminTotal, pointRows, adminRows] = await Promise.all([
    sources.points
      ? prisma.pointTransaction.count({ where: point })
      : Promise.resolve(0),
    sources.admin ? prisma.auditLog.count({ where: admin }) : Promise.resolve(0),
    sources.points
      ? prisma.pointTransaction.findMany({
          where: point,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: scanLimit,
          select: POINT_SELECT,
        })
      : Promise.resolve([] as PointRow[]),
    sources.admin
      ? prisma.auditLog.findMany({
          where: admin,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: scanLimit,
          select: ADMIN_SELECT,
        })
      : Promise.resolve([] as AdminRow[]),
  ]);

  const total = pointTotal + adminTotal;

  return {
    entries: mergeAuditLogEntries(
      pointRows.map(toPointEntry),
      adminRows.map(toAdminEntry),
      safePage,
      DEFAULT_PAGE_SIZE,
    ),
    page: safePage,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}

// Seluruh baris yang cocok filter untuk ekspor CSV, dibatasi AUDIT_EXPORT_LIMIT.
export async function getAuditLogEntriesForExport(
  filters: AuditLogFilters,
): Promise<AuditLogEntry[]> {
  const sources = resolveSources(filters);
  const point = pointWhere(filters);
  const admin = adminWhere(filters);

  const [pointRows, adminRows] = await Promise.all([
    sources.points
      ? prisma.pointTransaction.findMany({
          where: point,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: AUDIT_EXPORT_LIMIT,
          select: POINT_SELECT,
        })
      : Promise.resolve([] as PointRow[]),
    sources.admin
      ? prisma.auditLog.findMany({
          where: admin,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: AUDIT_EXPORT_LIMIT,
          select: ADMIN_SELECT,
        })
      : Promise.resolve([] as AdminRow[]),
  ]);

  return mergeAuditLogEntries(
    pointRows.map(toPointEntry),
    adminRows.map(toAdminEntry),
    1,
    AUDIT_EXPORT_LIMIT,
  );
}

export async function getAuditOutletOptions(): Promise<AuditOutletOption[]> {
  return prisma.outlet.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Pelaku yang dapat muncul pada jejak audit: kasir dan Super Admin (super admin
// dapat mengakses area kasir dan menjalankan aksi administratif).
export async function getAuditActorOptions(): Promise<AuditActorOption[]> {
  return prisma.user.findMany({
    where: { role: { in: [UserRole.CASHIER, UserRole.SUPER_ADMIN] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
