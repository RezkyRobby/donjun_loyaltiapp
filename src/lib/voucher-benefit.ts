import { RewardBenefitType } from "@/generated/prisma/enums";
import type { VoucherBenefitSnapshot } from "@/lib/shop-pricing";

// Penyusun snapshot manfaat voucher saat penukaran poin (PRD §7.3, AGENTS.md
// aturan 11). Manfaat disalin dari reward ke voucher yang baru terbit sehingga
// voucher tidak berubah bila reward diedit atau dinonaktifkan kemudian. Fungsi
// murni agar dapat diuji tanpa basis data; pemanggil menyediakan menu tertaut
// yang dibaca di dalam transaksi penukaran.

// Kolom manfaat pada reward yang menjadi sumber snapshot.
export type RewardBenefitSource = {
  benefitType: RewardBenefitType;
  linkedMenuId: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
};

// Menu tertaut yang dibaca saat penukaran (nama & harga disalin sebagai snapshot).
export type LinkedMenuSnapshot = {
  id: string;
  name: string;
  price: number;
};

function genericSnapshot(): VoucherBenefitSnapshot {
  return {
    benefitType: RewardBenefitType.GENERIC,
    discountPercent: null,
    discountAmount: null,
    linkedMenuId: null,
    linkedMenuName: null,
    linkedMenuPrice: null,
  };
}

export function buildVoucherBenefitSnapshot(
  reward: RewardBenefitSource,
  linkedMenu: LinkedMenuSnapshot | null,
): VoucherBenefitSnapshot {
  switch (reward.benefitType) {
    // PRODUCT tanpa menu tertaut yang tersedia diturunkan ke GENERIC agar
    // voucher tidak menjanjikan produk yang tidak dapat diberikan.
    case RewardBenefitType.PRODUCT:
      if (!linkedMenu) return genericSnapshot();

      return {
        benefitType: RewardBenefitType.PRODUCT,
        discountPercent: null,
        discountAmount: null,
        linkedMenuId: linkedMenu.id,
        linkedMenuName: linkedMenu.name,
        linkedMenuPrice: linkedMenu.price,
      };
    case RewardBenefitType.PERCENT_DISCOUNT:
      return {
        benefitType: RewardBenefitType.PERCENT_DISCOUNT,
        discountPercent: reward.discountPercent,
        discountAmount: null,
        linkedMenuId: null,
        linkedMenuName: null,
        linkedMenuPrice: null,
      };
    case RewardBenefitType.AMOUNT_DISCOUNT:
      return {
        benefitType: RewardBenefitType.AMOUNT_DISCOUNT,
        discountPercent: null,
        discountAmount: reward.discountAmount,
        linkedMenuId: null,
        linkedMenuName: null,
        linkedMenuPrice: null,
      };
    default:
      return genericSnapshot();
  }
}
