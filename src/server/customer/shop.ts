import type { Prisma } from "@/generated/prisma/client";
import type {
  PaymentAccountType,
  RewardBenefitType,
} from "@/generated/prisma/enums";
import { VoucherStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Kueri katalog belanja pelanggan (PRD §5.4 fitur 1–4). Hanya menu aktif yang
// tampil, dikelompokkan per kategori; kategori tanpa menu atau menu tanpa
// kategori tetap ditangani rapi. Seluruh harga yang ditampilkan bersumber dari
// server dan dihitung ulang lagi saat pembuatan pesanan (otoritatif).

export type ShopCatalogTag = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ShopCatalogGroup = {
  id: string;
  name: string;
  tags: ShopCatalogTag[];
};

export type ShopCatalogMenu = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  optionGroups: ShopCatalogGroup[];
};

export type ShopCatalogCategory = {
  id: string | null;
  name: string;
  sortOrder: number;
  menus: ShopCatalogMenu[];
};

const UNCATEGORIZED_KEY = "__uncategorized__";
const UNCATEGORIZED_NAME = "Menu Lainnya";
const UNCATEGORIZED_SORT = Number.MAX_SAFE_INTEGER;

const SHOP_MENU_SELECT = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  price: true,
  categoryId: true,
  category: { select: { id: true, name: true, sortOrder: true } },
  optionGroups: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      tags: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, priceDelta: true },
      },
    },
  },
} satisfies Prisma.MenuSelect;

type ShopMenuRow = Prisma.MenuGetPayload<{ select: typeof SHOP_MENU_SELECT }>;

function toShopCatalogMenu(row: ShopMenuRow): ShopCatalogMenu {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price: row.price,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    optionGroups: row.optionGroups.map((group) => ({
      id: group.id,
      name: group.name,
      tags: group.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        priceDelta: tag.priceDelta,
      })),
    })),
  };
}

export async function getCustomerShopCatalog(): Promise<ShopCatalogCategory[]> {
  const rows = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: SHOP_MENU_SELECT,
  });

  const categories = new Map<string, ShopCatalogCategory>();

  for (const row of rows) {
    const key = row.categoryId ?? UNCATEGORIZED_KEY;
    let category = categories.get(key);

    if (!category) {
      category = {
        id: row.categoryId,
        name: row.category?.name ?? UNCATEGORIZED_NAME,
        sortOrder: row.category?.sortOrder ?? UNCATEGORIZED_SORT,
        menus: [],
      };
      categories.set(key, category);
    }

    category.menus.push(toShopCatalogMenu(row));
  }

  return Array.from(categories.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export async function getCustomerMenuDetail(
  menuId: string,
): Promise<ShopCatalogMenu | null> {
  const row = await prisma.menu.findFirst({
    where: { id: menuId, isActive: true },
    select: SHOP_MENU_SELECT,
  });

  return row ? toShopCatalogMenu(row) : null;
}

export type ShopCheckoutOutlet = {
  id: string;
  name: string;
  address: string;
};

export type ShopCheckoutPaymentAccount = {
  id: string;
  type: PaymentAccountType;
  providerName: string;
  accountNumber: string | null;
  accountHolder: string | null;
  imageUrl: string | null;
};

export type ShopCheckoutVoucher = {
  id: string;
  voucherCode: string;
  rewardTitle: string;
  benefitType: RewardBenefitType;
  discountPercent: number | null;
  discountAmount: number | null;
  linkedMenuId: string | null;
  linkedMenuName: string | null;
  linkedMenuPrice: number | null;
};

export type ShopCheckoutOptions = {
  outlets: ShopCheckoutOutlet[];
  paymentAccounts: ShopCheckoutPaymentAccount[];
  vouchers: ShopCheckoutVoucher[];
};

// Opsi checkout: outlet pengambilan aktif, rekening tujuan aktif, dan voucher
// ACTIVE milik pelanggan (PRD §5.4 fitur 4). Manfaat voucher dibaca sebagai
// snapshot yang sudah tersimpan pada voucher.
export async function getCustomerCheckoutOptions(
  userId: string,
): Promise<ShopCheckoutOptions> {
  const [outlets, paymentAccounts, vouchers] = await Promise.all([
    prisma.outlet.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    prisma.paymentAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { providerName: "asc" }],
      select: {
        id: true,
        type: true,
        providerName: true,
        accountNumber: true,
        accountHolder: true,
        imageUrl: true,
      },
    }),
    prisma.voucher.findMany({
      where: { userId, status: VoucherStatus.ACTIVE },
      orderBy: { claimedAt: "desc" },
      select: {
        id: true,
        voucherCode: true,
        rewardTitle: true,
        benefitType: true,
        discountPercent: true,
        discountAmount: true,
        linkedMenuId: true,
        linkedMenuName: true,
        linkedMenuPrice: true,
      },
    }),
  ]);

  return { outlets, paymentAccounts, vouchers };
}
