import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MenuForm } from "@/components/admin/menu-form";
import { Button } from "@/components/ui/button";
import { menuIdSchema } from "@/lib/menu-admin";
import { getAdminMenuCategories } from "@/server/admin/menu-category-list";
import { getAdminMenuById } from "@/server/admin/menu-list";

export const metadata: Metadata = { title: "Ubah Menu" };

// Form perubahan menu beserta editor grup opsi/tag (PRD §5.3 fitur 8). Grup opsi
// dimuat berurutan dari detail menu agar sesuai tampilan katalog.
export default async function AdminMenuEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idParsed = menuIdSchema.safeParse(id);

  if (!idParsed.success) notFound();

  const [menu, categories] = await Promise.all([
    getAdminMenuById(idParsed.data),
    getAdminMenuCategories(),
  ]);

  if (!menu) notFound();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 w-fit">
        <Link href="/admin/menu">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke daftar menu
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Ubah Menu
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Perbarui detail menu, harga, dan pilihan opsinya.
        </p>
      </div>
      <div className="rounded-card border border-warm-border bg-card p-6">
        <MenuForm
          mode="edit"
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          initial={{
            id: menu.id,
            categoryId: menu.categoryId,
            name: menu.name,
            description: menu.description ?? "",
            price: String(menu.price),
            sortOrder: String(menu.sortOrder),
            isActive: menu.isActive,
            imageUrl: menu.imageUrl,
            optionGroups: menu.optionGroups.map((group) => ({
              name: group.name,
              tags: group.tags.map((tag) => ({
                name: tag.name,
                priceDelta: String(tag.priceDelta),
              })),
            })),
          }}
        />
      </div>
    </section>
  );
}
