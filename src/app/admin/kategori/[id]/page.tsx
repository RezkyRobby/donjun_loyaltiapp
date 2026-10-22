import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MenuCategoryForm } from "@/components/admin/menu-category-form";
import { Button } from "@/components/ui/button";
import { menuCategoryIdSchema } from "@/lib/menu-category-admin";
import { getAdminMenuCategoryById } from "@/server/admin/menu-category-list";

export const metadata: Metadata = { title: "Ubah Kategori Menu" };

// Form perubahan kategori menu (PRD §5.3 fitur 7).
export default async function AdminMenuCategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idParsed = menuCategoryIdSchema.safeParse(id);

  if (!idParsed.success) notFound();

  const category = await getAdminMenuCategoryById(idParsed.data);

  if (!category) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 w-fit">
        <Link href="/admin/kategori">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke daftar kategori
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Ubah Kategori Menu
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Perbarui nama, urutan tampil, dan status kategori.
        </p>
      </div>
      <div className="rounded-card border border-warm-border bg-card p-6">
        <MenuCategoryForm
          mode="edit"
          initial={{
            id: category.id,
            name: category.name,
            sortOrder: String(category.sortOrder),
            isActive: category.isActive,
          }}
        />
      </div>
    </section>
  );
}
