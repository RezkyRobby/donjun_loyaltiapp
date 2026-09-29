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
