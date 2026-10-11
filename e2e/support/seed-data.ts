// Data tetap untuk E2E (outlet penugasan kasir dan promo berbiaya 1 poin).
// Id ditentukan agar dapat dirujuk lintas berkas tanpa kueri tambahan.
export const E2E_OUTLET = {
  id: "e2e-outlet-panakkukang",
  name: "Donjun Donat E2E Panakkukang",
  address: "Jl. Pengujian E2E No. 1, Makassar",
  phone: "0411-999001",
} as const;

export const E2E_REWARD = {
  id: "e2e-reward-glaze",
  title: "Promo E2E: Gratis 1 Donat Glaze",
  description: "Voucher uji otomatis berbiaya 1 poin.",
  pointsCost: 1,
} as const;

// Katalog belanja tetap (kategori, menu dengan grup opsi/tag, rekening tujuan).
export const E2E_MENU_CATEGORY = {
  id: "e2e-category-donat",
  name: "Donat E2E",
  sortOrder: 0,
} as const;

export const E2E_MENU = {
  id: "e2e-menu-glaze",
  name: "Donat Glaze E2E",
  price: 10_000,
  categoryId: E2E_MENU_CATEGORY.id,
  optionGroup: { id: "e2e-group-topping", name: "Topping" },
  tags: [
    { id: "e2e-tag-coklat", name: "Coklat", priceDelta: 2_000 },
    { id: "e2e-tag-keju", name: "Keju", priceDelta: 3_000 },
  ],
} as const;

export const E2E_PAYMENT_ACCOUNT = {
  id: "e2e-payment-bca",
  type: "BANK_TRANSFER",
  providerName: "BCA E2E",
  accountNumber: "1234567890",
  accountHolder: "Donjun Donat E2E",
} as const;

// Voucher tetap untuk alur belanja: satu berdiskon nominal, satu generik.
export const E2E_VOUCHER_DISCOUNT = {
  id: "e2e-voucher-discount",
  code: "DJN-23456789ABCDEFGH",
  rewardTitle: "Voucher Diskon E2E",
  discountAmount: 5_000,
} as const;

export const E2E_VOUCHER_GENERIC = {
  id: "e2e-voucher-generic",
  code: "DJN-HGFEDCBA98765432",
  rewardTitle: "Voucher Generik E2E",
  discountAmount: 0,
} as const;

