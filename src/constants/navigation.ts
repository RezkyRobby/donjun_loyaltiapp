// Navigasi bawah area pelanggan (PRD Lampiran B). Design.md §10 membatasi
// maksimal 4 item pada viewport 375px; label memakai istilah domain yang benar
// (Voucher, bukan kupon). Daftar ini menjadi sumber tunggal bagi shell pelanggan.
export type CustomerNavItem = {
  href: string;
  label: string;
};

export const CUSTOMER_NAV_ITEMS: CustomerNavItem[] = [
  { href: "/dashboard", label: "Beranda" },
  { href: "/promo", label: "Promo" },
  { href: "/voucher", label: "Voucher" },
  { href: "/pengaturan", label: "Pengaturan" },
];
