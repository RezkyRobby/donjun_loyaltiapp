"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getCartCount, useCart } from "@/components/customer/cart-store";
import { formatCount } from "@/lib/format";

// Tombol melayang Belanja (design.md §9.6): akses ke modul belanja tanpa
// menambah item navigasi bawah. Satu tombol saja agar tidak menutupi aksi
// paling bawah konten; jumlah item keranjang dibawa sebagai lencana pada tombol
// (ikon + teks + angka), bukan tombol terpisah. FAB disembunyikan pada rute
// belanja dan keranjang karena di sana sudah menjadi konteks halaman.
const HIDDEN_PREFIXES = ["/belanja", "/keranjang"];

export function ShopFab() {
  const pathname = usePathname();
  const cart = useCart();
  const count = getCartCount(cart);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <Link
      href="/belanja"
      aria-label={
        count > 0
          ? `Belanja, ${formatCount(count)} item di keranjang`
          : "Belanja"
      }
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 inline-flex h-14 items-center gap-2 rounded-badge bg-brand-orange px-5 font-display text-lg font-semibold text-brand-brown-dark shadow-raised transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <ShoppingBag aria-hidden className="size-6" />
      <span>Belanja</span>
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-badge border-2 border-brand-yellow-light bg-brand-brown-dark px-1.5 text-sm font-bold tabular-nums text-brand-white"
        >
          {formatCount(count)}
        </span>
      ) : null}
    </Link>
  );
}
