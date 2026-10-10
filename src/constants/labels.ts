import type {
  OrderPaymentProofStatus,
  OrderStatus,
  PaymentAccountType,
  PointTransactionMethod,
  PointTransactionType,
  RewardBenefitType,
  VoucherStatus,
} from "@/generated/prisma/enums";
import type { AuditAction } from "@/constants/audit";
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

// Tipe manfaat voucher/reward (PRD §5.4 fitur 4, §7.3). Dipakai pada form reward
// admin dan tampilan detail voucher pelanggan: GENERIC tidak mengubah total,
// PRODUCT menambah 1 menu tertaut gratis, PERCENT_DISCOUNT/AMOUNT_DISCOUNT
// memotong total.
export const REWARD_BENEFIT_TYPE_LABELS: Record<RewardBenefitType, string> = {
  GENERIC: "Generik",
  PRODUCT: "Gratis 1 produk",
  PERCENT_DISCOUNT: "Diskon persen",
  AMOUNT_DISCOUNT: "Diskon nominal",
};

// Status pesanan belanja (PRD §5.4 fitur 7, §5.5, §7.6): ditampilkan pada
// pelacakan pesanan pelanggan, antrean kasir, dan monitoring admin. CANCELED =
// dibatalkan pelanggan selama AWAITING_PAYMENT.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Menunggu pembayaran",
  AWAITING_CONFIRMATION: "Menunggu konfirmasi",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
  EXPIRED: "Kedaluwarsa",
  CANCELED: "Dibatalkan",
};

// Jenis rekening tujuan pembayaran manual (PRD §5.3 fitur 9, §7.6).
export const PAYMENT_ACCOUNT_TYPE_LABELS: Record<PaymentAccountType, string> = {
  BANK_TRANSFER: "Transfer bank",
  EWALLET: "E-wallet",
  QRIS: "QRIS",
};

// Status bukti transfer manual (PRD §5.4 fitur 6, §7.6): ditampilkan pada detail
// pesanan pelanggan dan antrean kasir.
export const ORDER_PAYMENT_PROOF_STATUS_LABELS: Record<
  OrderPaymentProofStatus,
  string
> = {
  PENDING: "Menunggu tinjauan",
  ACCEPTED: "Diterima",
  REJECTED: "Ditolak",
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

// Sumber entri pada Audit Log Menyeluruh (PRD §5.3 fitur 3): transaksi poin
// operasional atau aksi administratif backoffice.
export const AUDIT_SOURCE_LABELS: Record<"POINT" | "ADMIN", string> = {
  POINT: "Transaksi Poin",
  ADMIN: "Aksi Administratif",
};

// Aksi administratif AuditLog (PRD §7.4): ditampilkan pada audit log dan ekspor
// CSV. Nilai kunci mengikuti konstanta AUDIT_ACTION.
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  VOUCHER_CANCELED: "Voucher dibatalkan",
  VOUCHER_REVERTED: "Validasi voucher dikoreksi",
  POINTS_ADJUSTED: "Saldo poin dikoreksi",
  REWARD_CREATED: "Reward dibuat",
  REWARD_UPDATED: "Reward diperbarui",
  REWARD_DELETED: "Reward dihapus",
  STAFF_CREATED: "Akun staf dibuat",
  STAFF_UPDATED: "Akun staf diperbarui",
  STAFF_INVITED: "Undangan staf dikirim",
  STAFF_CREDENTIALS_RESET: "Kredensial staf direset",
  CUSTOMER_SUSPENDED: "Pelanggan ditangguhkan",
  CUSTOMER_REACTIVATED: "Pelanggan diaktifkan kembali",
  OUTLET_CREATED: "Outlet dibuat",
  OUTLET_UPDATED: "Outlet diperbarui",
  OUTLET_DELETED: "Outlet dihapus",
  MENU_CATEGORY_CREATED: "Kategori menu dibuat",
  MENU_CATEGORY_UPDATED: "Kategori menu diperbarui",
  MENU_CATEGORY_DELETED: "Kategori menu dihapus",
  MENU_CREATED: "Menu dibuat",
  MENU_UPDATED: "Menu diperbarui",
  MENU_DELETED: "Menu dihapus",
  PAYMENT_ACCOUNT_CREATED: "Rekening pembayaran dibuat",
  PAYMENT_ACCOUNT_UPDATED: "Rekening pembayaran diperbarui",
  PAYMENT_ACCOUNT_DELETED: "Rekening pembayaran dihapus",
  ORDER_CONFIRMED: "Pembayaran pesanan dikonfirmasi",
  ORDER_REJECTED: "Pembayaran pesanan ditolak",
  ORDER_COMPLETED: "Pesanan diselesaikan",
  ORDER_CANCELED: "Pesanan dibatalkan",
  ORDER_EXPIRED: "Pesanan kedaluwarsa",
};

