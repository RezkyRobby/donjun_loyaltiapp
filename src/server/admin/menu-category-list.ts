import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Kueri daftar kategori menu untuk backoffice (PRD §5.3 fitur 7). Jumlah menu
// per kategori ditampilkan sebagai konteks; menghapus kategori tidak menghapus
// menunya (relasi `Menu.categoryId` di-set null), hanya menandainya tanpa
// kategori.

export type AdminMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  menuCount: number;
};

const MENU_CATEGORY_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  _count: { select: { menus: true } },
} satisfies Prisma.MenuCategorySelect;

type MenuCategoryRow = Prisma.MenuCategoryGetPayload<{
  select: typeof MENU_CATEGORY_SELECT;
}>;

function toAdminMenuCategory(row: MenuCategoryRow): AdminMenuCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    menuCount: row._count.menus,
  };
}

export async function getAdminMenuCategories(): Promise<AdminMenuCategory[]> {
  const rows = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: MENU_CATEGORY_SELECT,
  });

  return rows.map(toAdminMenuCategory);
}

export async function getAdminMenuCategoryById(
  id: string,
): Promise<AdminMenuCategory | null> {
  const row = await prisma.menuCategory.findUnique({
    where: { id },
    select: MENU_CATEGORY_SELECT,
  });

  return row ? toAdminMenuCategory(row) : null;
}
