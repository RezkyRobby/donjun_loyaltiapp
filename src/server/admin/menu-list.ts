import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Kueri daftar & detail menu belanja untuk backoffice (PRD §5.3 fitur 8).
// Daftar membawa nama kategori dan jumlah grup opsi sebagai konteks ringkas;
// detail memuat seluruh grup opsi beserta tag berurutan untuk formulir edit.
// Harga otoritatif tetap dihitung server saat pemesanan (PRD §5.4 fitur 4).

export type AdminMenuOptionTag = {
  id: string;
  name: string;
  priceDelta: number;
  sortOrder: number;
};

export type AdminMenuOptionGroup = {
  id: string;
  name: string;
  sortOrder: number;
  tags: AdminMenuOptionTag[];
};

export type AdminMenuSummary = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  optionGroupCount: number;
  canDelete: boolean;
};

export type AdminMenuDetail = AdminMenuSummary & {
  optionGroups: AdminMenuOptionGroup[];
};

const ADMIN_MENU_LIST_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  imageUrl: true,
  price: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  category: { select: { name: true } },
  _count: {
    select: { optionGroups: true, orderItems: true, vouchers: true },
  },
} satisfies Prisma.MenuSelect;

const ADMIN_MENU_DETAIL_SELECT = {
  ...ADMIN_MENU_LIST_SELECT,
  optionGroups: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      tags: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, priceDelta: true, sortOrder: true },
      },
    },
  },
} satisfies Prisma.MenuSelect;

type MenuListRow = Prisma.MenuGetPayload<{
  select: typeof ADMIN_MENU_LIST_SELECT;
}>;

type MenuDetailRow = Prisma.MenuGetPayload<{
  select: typeof ADMIN_MENU_DETAIL_SELECT;
}>;

function toAdminMenuSummary(row: MenuListRow): AdminMenuSummary {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price: row.price,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    optionGroupCount: row._count.optionGroups,
    canDelete: row._count.orderItems === 0 && row._count.vouchers === 0,
  };
}

function toAdminMenuDetail(row: MenuDetailRow): AdminMenuDetail {
  return {
    ...toAdminMenuSummary(row),
    optionGroups: row.optionGroups.map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      tags: group.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        priceDelta: tag.priceDelta,
        sortOrder: tag.sortOrder,
      })),
    })),
  };
}

export async function getAdminMenus(): Promise<AdminMenuSummary[]> {
  const rows = await prisma.menu.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: ADMIN_MENU_LIST_SELECT,
  });

  return rows.map(toAdminMenuSummary);
}

export async function getAdminMenuById(
  id: string,
): Promise<AdminMenuDetail | null> {
  const row = await prisma.menu.findUnique({
    where: { id },
    select: ADMIN_MENU_DETAIL_SELECT,
  });

  return row ? toAdminMenuDetail(row) : null;
}
