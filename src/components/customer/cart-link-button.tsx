"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { getCartCount, useCart } from "@/components/customer/cart-store";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";

// Tautan menuju keranjang untuk dipakai di dalam modul belanja (tempat FAB
// disembunyikan). Jumlah item tampil sebagai teks, bukan warna saja.
export function CartLinkButton() {
  const cart = useCart();
  const count = getCartCount(cart);

  return (
    <Button asChild variant="outline" className="h-11 shrink-0 px-3">
      <Link href="/keranjang">
        <ShoppingCart aria-hidden className="size-5" />
        <span>
          Keranjang{count > 0 ? ` (${formatCount(count)})` : ""}
        </span>
      </Link>
    </Button>
  );
}
