import { Plus, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActiveStatusBadge } from "@/components/admin/active-status-badge";
import { MenuCategoryActions } from "@/components/admin/menu-category-actions";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { getAdminMenuCategories } from "@/server/admin/menu-category-list";

export const metadata: Metadata = { title: "Kategori Menu" };

// Manajemen kategori menu (PRD §5.3 fitur 7). Register *product* (design.md §2):
// tabel padat pada layar lebar, kartu pada layar sempit. Menghapus kategori
// tidak menghapus menunya; menu terkait menjadi tanpa kategori.
export default async function AdminMenuCategoryPage() {
  const categories = await getAdminMenuCategories();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Kategori Menu
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Kelompokkan menu belanja agar katalog pelanggan mudah ditelusuri.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/kategori/baru">
            <Plus aria-hidden className="size-4" />
            Tambah kategori
          </Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Tags className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada kategori menu
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Buat kategori pertama agar menu belanja dapat dikelompokkan dan
            ditampilkan rapi pada katalog pelanggan.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/kategori/baru">
              <Plus aria-hidden className="size-4" />
              Tambah kategori
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kategori
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Urutan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Jumlah menu
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {categories.map((category) => (
                  <tr key={category.id} className="h-14 align-middle">
                    <td className="px-4 py-2 font-medium text-brand-brown-dark">
                      {category.name}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatCount(category.sortOrder)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatCount(category.menuCount)}
                    </td>
                    <td className="px-4 py-2">
                      <ActiveStatusBadge isActive={category.isActive} />
                    </td>
                    <td className="px-4 py-2">
                      <MenuCategoryActions
                        id={category.id}
                        isActive={category.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-brand-brown-dark">
                    {category.name}
                  </p>
                  <ActiveStatusBadge isActive={category.isActive} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-brand-brown-muted">Urutan</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatCount(category.sortOrder)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Jumlah menu</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatCount(category.menuCount)}
                    </dd>
                  </div>
                </dl>
                <MenuCategoryActions
                  id={category.id}
                  isActive={category.isActive}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
