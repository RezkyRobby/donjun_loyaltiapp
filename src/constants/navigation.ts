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

// Navigasi area kasir (PRD Lampiran B). Register *product* (design.md §2):
// label singkat, target sentuh besar; urutan mengikuti alur kerja kasir.
export type CashierNavItem = {
  href: string;
  label: string;
};

export const CASHIER_NAV_ITEMS: CashierNavItem[] = [
  { href: "/kasir/scan", label: "Scan" },
  { href: "/kasir/validasi", label: "Validasi" },
  { href: "/kasir/riwayat", label: "Riwayat" },
];

// Navigasi area admin (PRD Lampiran B). Register *product* (design.md §2):
// padat dan netral; nav mendatar yang dapat digulir pada layar sempit. Urutan
// mengikuti menu backoffice: analitik, katalog, lalu pengelolaan operasional.
export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Analitik" },
  { href: "/admin/reward", label: "Reward" },
  { href: "/admin/staf", label: "Staf" },
  { href: "/admin/pelanggan", label: "Pelanggan" },
  { href: "/admin/outlet", label: "Outlet" },
  { href: "/admin/audit", label: "Audit" },
];
