import { Cookie } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CartLinkButton } from "@/components/customer/cart-link-button";
import { ShopMenuCard } from "@/components/customer/shop-menu-card";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerShopCatalog } from "@/server/customer/shop";

export const metadata: Metadata = { title: "Belanja" };

// Katalog belanja pelanggan (PRD §5.4 fitur 1, §8.7 langkah 1). Menu aktif
// dikelompokkan per kategori; menu tanpa kategori ditampilkan pada bucket
// "Menu Lainnya" dari lapisan server.
export default async function CustomerShopPage() {
  await requireCustomer();
  const categories = await getCustomerShopCatalog();
  const totalMenus = categories.reduce(
    (sum, category) => sum + category.menus.length,
    0,
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Belanja
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Pilih menu dan opsi, lalu buat pesanan. Pembayaran melalui transfer
            manual ke rekening Donjun Donat.
          </p>
        </div>
        <CartLinkButton />
      </div>

      {totalMenus === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-6 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Cookie className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada menu
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Menu belanja belum tersedia saat ini. Silakan coba lagi nanti.
          </p>
          <Button asChild variant="outline" className="h-12">
            <Link href="/dashboard">Kembali ke beranda</Link>
          </Button>
        </div>
      ) : (
        categories.map((category) => (
          <section
            key={category.id ?? "lainnya"}
            aria-labelledby={`kategori-${category.id ?? "lainnya"}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`kategori-${category.id ?? "lainnya"}`}
              className="font-display text-lg font-semibold text-brand-brown-dark"
            >
              {category.name}
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {category.menus.map((menu) => (
                <li key={menu.id} className="flex">
                  <ShopMenuCard menu={menu} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
