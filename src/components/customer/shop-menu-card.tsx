import { Cookie } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { QuickAddButton } from "@/components/customer/quick-add-button";
import { formatRupiah } from "@/lib/format";
import type { ShopCatalogMenu } from "@/server/customer/shop";

// Kartu menu pada katalog belanja (PRD §5.4 fitur 1, design.md §9). Foto rasio
// 1:1, nama, dan harga. Menu tanpa grup opsi menampilkan tombol tambah cepat;
// menu beropsi menampilkan nama grup sebagai penanda bahwa opsi dipilih di
// halaman detail.
export function ShopMenuCard({ menu }: { menu: ShopCatalogMenu }) {
  const hasOptions = menu.optionGroups.length > 0;
  const optionHint = menu.optionGroups.map((group) => group.name).join(" · ");

  return (
    <article className="flex flex-1 flex-col overflow-hidden rounded-card border border-warm-border bg-card shadow-card">
      <Link
        href={`/belanja/${menu.id}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-square bg-warm-neutral">
          {menu.imageUrl ? (
            <Image
              src={menu.imageUrl}
              alt={`Foto ${menu.name}`}
              fill
              sizes="(max-width: 768px) 45vw, 224px"
              className="object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-full items-center justify-center text-brand-brown-muted"
            >
              <Cookie className="size-10" />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="font-display text-base font-semibold leading-tight text-brand-brown-dark">
            {menu.name}
          </h3>
          <p className="mt-auto pt-1 text-sm font-semibold tabular-nums text-brand-orange-deep">
            {formatRupiah(menu.price)}
          </p>
        </div>
      </Link>

      <div className="px-3 pb-3">
        {hasOptions ? (
          <p className="flex h-10 items-center text-xs text-brand-brown-muted">
            Pilih {optionHint} di detail menu
          </p>
        ) : (
          <QuickAddButton
            menuId={menu.id}
            name={menu.name}
            imageUrl={menu.imageUrl}
            price={menu.price}
          />
        )}
      </div>
    </article>
  );
}
