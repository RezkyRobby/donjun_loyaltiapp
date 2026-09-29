import type {
  PointTransactionMethod,
  PointTransactionType,
  VoucherStatus,
} from "@/generated/prisma/enums";
import type { RewardUnavailableReason } from "@/lib/reward-availability";

// Kamus label terpusat (AGENTS.md: label status/istilah UI lewat satu kamus di
// src/constants, jangan hardcode string per komponen). Semua teks Bahasa
// Indonesia formal.
export const REWARD_UNAVAILABLE_REASON_LABELS: Record<
  RewardUnavailableReason,
  string
> = {
  INACTIVE: "Promo sedang tidak aktif",
  OUT_OF_PERIOD: "Di luar periode promo",
  QUOTA_EXHAUSTED: "Kuota promo sudah habis",
  USER_LIMIT_REACHED: "Batas klaim Anda sudah tercapai",
  INSUFFICIENT_POINTS: "Poin Anda belum mencukupi",
};

// Status voucher (design.md §8): ACTIVE → "Aktif", USED → "Terpakai",
// CANCELED → "Dibatalkan".
export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  ACTIVE: "Aktif",
  USED: "Terpakai",
  CANCELED: "Dibatalkan",
};

// Metode input transaksi poin (PRD §5.2 fitur 2 & 6): ditampilkan pada riwayat
// injeksi kasir dan audit log admin.
export const POINT_TRANSACTION_METHOD_LABELS: Record<
  PointTransactionMethod,
  string
> = {
  QR_SCAN: "Scan QR",
  USERNAME: "Input username",
  BARCODE_SCAN: "Scan barcode",
  MANUAL_CODE: "Kode manual",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
};

// Jenis transaksi poin (PRD §7.4): ditampilkan pada riwayat poin pelanggan di
// backoffice agar Super Admin memahami asal penyebab perubahan saldo.
export const POINT_TRANSACTION_TYPE_LABELS: Record<
  PointTransactionType,
  string
> = {
  EARN: "Injeksi poin",
  REDEEM: "Penukaran voucher",
  ADJUST: "Koreksi manual",
  REVERSAL: "Pengembalian poin",
};

