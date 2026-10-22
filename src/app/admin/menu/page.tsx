import { Plus, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ActiveStatusBadge } from "@/components/admin/active-status-badge";
import { MenuActions } from "@/components/admin/menu-actions";
import { Button } from "@/components/ui/button";
import { formatCount, formatRupiah } from "@/lib/format";
import { getAdminMenus, type AdminMenuSummary } from "@/server/admin/menu-list";

export const metadata: Metadata = { title: "Menu Belanja" };

// Manajemen menu belanja (PRD §5.3 fitur 8). Register *product* (design.md §2):
// tabel padat pada layar lebar, kartu pada layar sempit. Menu yang sudah dipakai
// pesanan/voucher hanya dapat dinonaktifkan, bukan dihapus.

function MenuThumbnail({ menu }: { menu: AdminMenuSummary }) {
  if (!menu.imageUrl) {
    return (
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-button bg-warm-neutral text-brand-brown-muted"
      >
        <UtensilsCrossed className="size-5" />
      </span>
    );
  }

  return (
    <Image
      src={menu.imageUrl}
      alt={`Gambar menu ${menu.name}`}
      width={64}
      height={48}
      className="h-12 w-16 shrink-0 rounded-button border border-warm-border object-cover"
    />
  );
}

export default async function AdminMenuPage() {
  const menus = await getAdminMenus();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Menu Belanja
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Kelola menu, harga, kategori, serta grup opsi dan tag tambahan.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/menu/baru">
            <Plus aria-hidden className="size-4" />
            Tambah menu
          </Link>
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <UtensilsCrossed className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada menu
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Tambahkan menu pertama agar pelanggan dapat berbelanja lewat
            aplikasi.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/menu/baru">
              <Plus aria-hidden className="size-4" />
              Tambah menu
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-warm-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-warm-neutral text-left text-caption uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Menu
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kategori
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Harga
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Grup opsi
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border bg-card">
                {menus.map((menu) => (
                  <tr key={menu.id} className="h-14 align-middle">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <MenuThumbnail menu={menu} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-brown-dark">
                            {menu.name}
                          </p>
                          {menu.description ? (
                            <p className="max-w-xs truncate text-caption text-brand-brown-muted">
                              {menu.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-brand-brown-dark">
                      {menu.categoryName ?? "Tanpa kategori"}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatRupiah(menu.price)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatCount(menu.optionGroupCount)}
                    </td>
                    <td className="px-4 py-2">
                      <ActiveStatusBadge isActive={menu.isActive} />
                    </td>
                    <td className="px-4 py-2">
                      <MenuActions
                        id={menu.id}
                        isActive={menu.isActive}
                        canDelete={menu.canDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {menus.map((menu) => (
              <li
                key={menu.id}
                className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <MenuThumbnail menu={menu} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-brown-dark">
                      {menu.name}
                    </p>
                    <ActiveStatusBadge isActive={menu.isActive} />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-brand-brown-muted">Kategori</dt>
                    <dd className="text-brand-brown-dark">
                      {menu.categoryName ?? "Tanpa kategori"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Harga</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatRupiah(menu.price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Grup opsi</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatCount(menu.optionGroupCount)}
                    </dd>
                  </div>
                </dl>
                <MenuActions
                  id={menu.id}
                  isActive={menu.isActive}
                  canDelete={menu.canDelete}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
