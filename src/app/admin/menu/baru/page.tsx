import type { Metadata } from "next";

import { MenuForm } from "@/components/admin/menu-form";
import { getAdminMenuCategories } from "@/server/admin/menu-category-list";

export const metadata: Metadata = { title: "Tambah Menu" };

// Form pembuatan menu baru beserta grup opsi/tag (PRD §5.3 fitur 8).
export default async function AdminMenuCreatePage() {
  const categories = await getAdminMenuCategories();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Menu
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat menu baru beserta harga dan pilihan opsinya.
        </p>
      </div>
      <div className="rounded-card border border-warm-border bg-card p-6">
        <MenuForm
          mode="create"
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />
      </div>
    </section>
  );
}
