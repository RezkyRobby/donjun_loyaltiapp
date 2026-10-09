import type { RewardBenefitType } from "@/generated/prisma/enums";

// Perhitungan harga pesanan belanja (PRD §5.4 fitur 4, §8.7). Seluruh harga
// dan potongan dihitung ulang di server dari data menu terkini — harga dari
// klien diabaikan (AGENTS.md aturan 1). Fungsi murni tanpa akses database agar
// dapat diuji unit dan dipakai di dalam transaksi pembuatan pesanan (Task 42).

// Tag opsi terpilih; `priceDelta` bersumber dari data menu server, bukan klien.
export type ShopPricedItemOption = {
  tagId: string;
  name: string;
  priceDelta: number;
};

// Item yang akan dipesan beserta harga satuan otoritatif dari server.
export type ShopPricedItem = {
  menuId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  options: ShopPricedItemOption[];
};

// Baris pesanan hasil perhitungan server (siap disimpan sebagai OrderItem).
export type ShopOrderLine = ShopPricedItem & {
  isFree: boolean;
  lineTotal: number;
};

// Snapshot manfaat voucher (PRD §7.3): dibaca dari voucher yang ditempel, bukan
// dari reward yang dapat berubah setelah penukaran.
export type VoucherBenefitSnapshot = {
  benefitType: RewardBenefitType;
  discountPercent: number | null;
  discountAmount: number | null;
  linkedMenuId: string | null;
  linkedMenuName: string | null;
  linkedMenuPrice: number | null;
};

export type ShopTotals = {
  lines: ShopOrderLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
};

// Harga satuan = harga menu + akumulasi priceDelta tag opsi.
export function getLineUnitPrice(item: ShopPricedItem): number {
  return (
    item.unitPrice +
    item.options.reduce((sum, option) => sum + option.priceDelta, 0)
  );
}

// Total baris = harga satuan × jumlah; baris gratis (dari voucher PRODUCT)
// selalu bernilai 0 meski menyimpan snapshot harga untuk riwayat.
export function getLineTotal(item: ShopPricedItem, isFree = false): number {
  if (isFree) return 0;

  return getLineUnitPrice(item) * item.quantity;
}

// Potongan dari voucher. PRODUCT menambah item gratis (bukan potongan nominal),
// GENERIC tidak mengubah total. PERCENT dibulatkan ke bawah ke rupiah utuh;
// AMOUNT dibatasi agar tidak melebihi subtotal (total tidak pernah negatif).
export function getVoucherDiscount(
  subtotal: number,
  voucher: VoucherBenefitSnapshot | null,
): number {
  if (!voucher) return 0;

  switch (voucher.benefitType) {
    case "PERCENT_DISCOUNT": {
      const percent = clamp(voucher.discountPercent ?? 0, 0, 100);

      return Math.floor((subtotal * percent) / 100);
    }
    case "AMOUNT_DISCOUNT": {
      const amount = Math.max(voucher.discountAmount ?? 0, 0);

      return Math.min(amount, subtotal);
    }
    case "PRODUCT":
    case "GENERIC":
    default:
      return 0;
  }
}

// Menghitung seluruh baris pesanan, subtotal, potongan, dan total akhir.
export function calculateShopTotals(
  items: ShopPricedItem[],
  voucher: VoucherBenefitSnapshot | null = null,
): ShopTotals {
  const lines: ShopOrderLine[] = items.map((item) => ({
    ...item,
    isFree: false,
    lineTotal: getLineTotal(item, false),
  }));

  // Voucher PRODUCT menambahkan 1 baris menu tertaut gratis (PRD §5.4 fitur 4).
  if (voucher?.benefitType === "PRODUCT" && voucher.linkedMenuId) {
    lines.push({
      menuId: voucher.linkedMenuId,
      menuName: voucher.linkedMenuName ?? "Menu gratis",
      unitPrice: voucher.linkedMenuPrice ?? 0,
      quantity: 1,
      note: null,
      options: [],
      isFree: true,
      lineTotal: 0,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discountAmount = getVoucherDiscount(subtotal, voucher);

  return {
    lines,
    subtotal,
    discountAmount,
    total: Math.max(subtotal - discountAmount, 0),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
