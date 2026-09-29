import { AUDIT_SOURCE_LABELS } from "@/constants/labels";
import {
  getAuditActionLabel,
  getAuditMethodLabel,
  type AuditLogEntry,
} from "@/lib/audit-log";
import { formatDateTimeWita, witaDayKey } from "@/lib/datetime";

// Ekspor CSV Audit Log Menyeluruh (PRD §5.3 fitur 3) untuk mendeteksi kecurangan
// internal. Fungsi di sini murni dan dapat diuji tanpa basis data; pengiriman
// berkas ditangani Route Handler `/api/admin/audit/export`.

export const AUDIT_CSV_HEADERS = [
  "Waktu (WITA)",
  "Sumber",
  "Aksi",
  "Pelaku",
  "Outlet",
  "Pelanggan",
  "Username",
  "Metode",
  "Jumlah Poin",
  "Kode Voucher",
  "Entitas",
  "ID Entitas",
  "Catatan/Detail",
] as const;

// Sel CSV selalu dikutip; tanda kutip ganda di-escape dengan menggandakannya
// (RFC 4180). Mencegah pemisah kolom atau baris baru merusak struktur berkas.
export function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function entryDetail(entry: AuditLogEntry): string {
  if (entry.source === "ADMIN") {
    if (entry.metadata === null || entry.metadata === undefined) return "";

    try {
      return JSON.stringify(entry.metadata);
    } catch {
      return "";
    }
  }

  return entry.note ?? "";
}

export function toAuditCsvRow(entry: AuditLogEntry): string[] {
  return [
    formatDateTimeWita(entry.createdAt),
    AUDIT_SOURCE_LABELS[entry.source],
    getAuditActionLabel(entry.actionKey),
    entry.actorName ?? "",
    entry.outletName ?? "",
    entry.customerName ?? "",
    entry.customerUsername ? `@${entry.customerUsername}` : "",
    getAuditMethodLabel(entry.method),
    entry.amount === null ? "" : String(entry.amount),
    entry.voucherCode ?? "",
    entry.entity ?? "",
    entry.entityId ?? "",
    entryDetail(entry),
  ];
}

// Membentuk berkas CSV dengan pemisah baris CRLF agar kompatibel dengan Excel.
export function buildAuditCsv(entries: AuditLogEntry[]): string {
  const lines = [AUDIT_CSV_HEADERS.map(escapeCsvCell).join(",")];

  for (const entry of entries) {
    lines.push(toAuditCsvRow(entry).map(escapeCsvCell).join(","));
  }

  return lines.join("\r\n");
}

export function buildAuditCsvFilename(now: Date): string {
  return `audit-log-${witaDayKey(now)}.csv`;
}
