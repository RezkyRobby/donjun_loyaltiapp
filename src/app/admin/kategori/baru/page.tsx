import type { Metadata } from "next";

import { MenuCategoryForm } from "@/components/admin/menu-category-form";

export const metadata: Metadata = { title: "Tambah Kategori Menu" };

// Form pembuatan kategori menu baru (PRD §5.3 fitur 7).
export default function AdminMenuCategoryCreatePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Tambah Kategori Menu
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Buat kategori baru untuk mengelompokkan menu belanja.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <MenuCategoryForm mode="create" />
      </div>
    </section>
  );
}
