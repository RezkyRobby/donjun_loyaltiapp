"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import {
  menuCategoryFormSchema,
  menuCategoryIdSchema,
  type MenuCategoryFormInput,
} from "@/lib/menu-category-admin";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Server Action manajemen kategori menu (PRD §5.3 fitur 7). Setiap mutasi
// melewati guard Super Admin, validasi Zod ulang (AGENTS.md aturan 1), dan
// menulis AuditLog dalam transaksi yang sama (aturan 9). Menghapus kategori
// tidak menghapus menunya: `Menu.categoryId` di-set null sehingga menu terkait
// menjadi tanpa kategori dan tetap tampil rapi di katalog (PRD §5.4 fitur 1).

export type MenuCategoryActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function categoryAuditMetadata(category: MenuCategoryFormInput) {
  return {
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

export async function createMenuCategory(
  input: MenuCategoryFormInput,
): Promise<MenuCategoryActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = menuCategoryFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data kategori menu.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.menuCategory.create({
        data: {
          name: data.name,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
        select: { id: true },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_CATEGORY_CREATED,
        entity: AUDIT_ENTITY.MENU_CATEGORY,
        entityId: created.id,
        metadata: categoryAuditMetadata(data),
      });

      return created;
    });

    revalidatePath("/admin/kategori");

    return {
      ok: true,
      id: category.id,
      message: "Kategori menu berhasil dibuat.",
    };
  } catch (error) {
    console.error("[menu-category] gagal membuat kategori menu", error);

    return {
      ok: false,
      message: "Gagal menyimpan kategori menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function updateMenuCategory(
  id: string,
  input: MenuCategoryFormInput,
): Promise<MenuCategoryActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuCategoryIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Kategori menu tidak valid." };
  }

  const parsed = menuCategoryFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data kategori menu.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const existing = await prisma.menuCategory.findUnique({
    where: { id: idParsed.data },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, message: "Kategori menu tidak ditemukan." };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.menuCategory.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_CATEGORY_UPDATED,
        entity: AUDIT_ENTITY.MENU_CATEGORY,
        entityId: existing.id,
        metadata: categoryAuditMetadata(data),
      });
    });

    revalidatePath("/admin/kategori");
    revalidatePath(`/admin/kategori/${existing.id}`);

    return {
      ok: true,
      id: existing.id,
      message: "Kategori menu berhasil diperbarui.",
    };
  } catch (error) {
    console.error("[menu-category] gagal memperbarui kategori menu", error);

    return {
      ok: false,
      message: "Gagal menyimpan kategori menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function setMenuCategoryActive(
  id: string,
  isActive: boolean,
): Promise<MenuCategoryActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuCategoryIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Kategori menu tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.menuCategory.findUnique({
        where: { id: idParsed.data },
        select: { id: true, name: true, sortOrder: true, isActive: true },
      });

      if (!category) return null;
      if (category.isActive === isActive) return { id: category.id };

      await tx.menuCategory.update({
        where: { id: category.id },
        data: { isActive },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_CATEGORY_UPDATED,
        entity: AUDIT_ENTITY.MENU_CATEGORY,
        entityId: category.id,
        metadata: {
          name: category.name,
          sortOrder: category.sortOrder,
          isActive,
          change: "STATUS",
        },
      });

      return { id: category.id };
    });

    if (!result) {
      return { ok: false, message: "Kategori menu tidak ditemukan." };
    }

    revalidatePath("/admin/kategori");
    revalidatePath(`/admin/kategori/${result.id}`);

    return {
      ok: true,
      id: result.id,
      message: isActive ? "Kategori menu diaktifkan." : "Kategori menu dinonaktifkan.",
    };
  } catch (error) {
    console.error("[menu-category] gagal mengubah status kategori menu", error);

    return {
      ok: false,
      message: "Gagal mengubah status kategori menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function deleteMenuCategory(
  id: string,
): Promise<MenuCategoryActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuCategoryIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Kategori menu tidak valid." };
  }

  const category = await prisma.menuCategory.findUnique({
    where: { id: idParsed.data },
    select: { id: true, name: true, _count: { select: { menus: true } } },
  });

  if (!category) {
    return { ok: false, message: "Kategori menu tidak ditemukan." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // onDelete: SetNull pada Menu.categoryId membuat menu terkait menjadi
      // tanpa kategori, bukan terhapus (PRD §5.4 fitur 1).
      await tx.menuCategory.delete({ where: { id: category.id } });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_CATEGORY_DELETED,
        entity: AUDIT_ENTITY.MENU_CATEGORY,
        entityId: category.id,
        metadata: { name: category.name, menuCount: category._count.menus },
      });
    });

    revalidatePath("/admin/kategori");

    const suffix =
      category._count.menus > 0
        ? ` ${category._count.menus} menu terkait kini tanpa kategori.`
        : "";

    return {
      ok: true,
      id: category.id,
      message: `Kategori menu berhasil dihapus.${suffix}`,
    };
  } catch (error) {
    console.error("[menu-category] gagal menghapus kategori menu", error);

    return {
      ok: false,
      message: "Gagal menghapus kategori menu. Coba lagi sebentar lagi.",
    };
  }
}
