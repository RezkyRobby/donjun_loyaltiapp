// Kamus aksi dan entitas AuditLog (PRD §5.3 fitur 3, §7.4). Nilai disimpan apa
// adanya sebagai string pada kolom AuditLog; konstanta terpusat mencegah salah
// ketik antar pemanggil dan menjadi sumber tunggal bagi filter audit log admin.
export const AUDIT_ACTION = {
  VOUCHER_CANCELED: "VOUCHER_CANCELED",
  VOUCHER_REVERTED: "VOUCHER_REVERTED",
  POINTS_ADJUSTED: "POINTS_ADJUSTED",
  REWARD_CREATED: "REWARD_CREATED",
  REWARD_UPDATED: "REWARD_UPDATED",
  REWARD_DELETED: "REWARD_DELETED",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

// Jenis entitas terdampak (PRD §7.4). Memakai nama model Prisma agar konsisten
// dengan kolom `entity`.
export const AUDIT_ENTITY = {
  VOUCHER: "Voucher",
  USER: "User",
  REWARD: "RewardCatalog",
} as const;

export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];
