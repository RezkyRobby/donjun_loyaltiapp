"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { Prisma } from "@/generated/prisma/client";
import { uploadMenuImage } from "@/lib/cloudinary";
import { menuFormSchema, menuIdSchema, type MenuFormInput } from "@/lib/menu-admin";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Server Action manajemen menu belanja (PRD §5.3 fitur 8). Setiap mutasi
// melewati guard Super Admin, validasi Zod ulang (AGENTS.md aturan 1), dan
// menulis AuditLog dalam transaksi yang sama (aturan 9). Grup opsi/tag dikelola
// sebagai satu kesatuan: saat memperbarui, seluruh grup lama diganti dengan
// masukan terkini (masukan tidak membawa id). Menu yang telah direferensikan
// pesanan atau voucher tidak dihapus permanen — cukup dinonaktifkan.

export type MenuFormPayload = MenuFormInput & {
  image?: File | null;
  removeImage?: boolean;
};

export type MenuActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function menuAuditMetadata(menu: MenuFormInput) {
  return {
    name: menu.name,
    categoryId: menu.categoryId,
    price: menu.price,
    sortOrder: menu.sortOrder,
    isActive: menu.isActive,
    optionGroupCount: menu.optionGroups.length,
    optionTagCount: menu.optionGroups.reduce(
      (total, group) => total + group.tags.length,
      0,
    ),
  };
}

function optionGroupWrites(menu: MenuFormInput) {
  return menu.optionGroups.map((group) => ({
    name: group.name,
    sortOrder: group.sortOrder,
    tags: {
      create: group.tags.map((tag) => ({
        name: tag.name,
        priceDelta: tag.priceDelta,
        sortOrder: tag.sortOrder,
      })),
    },
  }));
}

function isForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export async function createMenu(
  payload: MenuFormPayload,
): Promise<MenuActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = menuFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data menu.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  let imageUrl: string | null = null;
  if (payload.image) {
    const upload = await uploadMenuImage(payload.image);

    if (!upload.ok) {
      return {
        ok: false,
        message: upload.message,
        fieldErrors: { image: upload.message },
      };
    }

    imageUrl = upload.url;
  }

  try {
    const menu = await prisma.$transaction(async (tx) => {
      const created = await tx.menu.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          imageUrl,
          price: data.price,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          optionGroups: { create: optionGroupWrites(data) },
        },
        select: { id: true },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_CREATED,
        entity: AUDIT_ENTITY.MENU,
        entityId: created.id,
        metadata: menuAuditMetadata(data),
      });

      return created;
    });

    revalidatePath("/admin/menu");

    return { ok: true, message: "Menu berhasil dibuat.", id: menu.id };
  } catch (error) {
    console.error("[menu] gagal membuat menu", error);

    return {
      ok: false,
      message: "Gagal menyimpan menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function updateMenu(
  id: string,
  payload: MenuFormPayload,
): Promise<MenuActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Menu tidak valid." };
  }

  const parsed = menuFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data menu.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = await prisma.menu.findUnique({
    where: { id: idParsed.data },
    select: { id: true, imageUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Menu tidak ditemukan." };
  }

  let imageUrl = existing.imageUrl;
  if (payload.image) {
    const upload = await uploadMenuImage(payload.image);

    if (!upload.ok) {
      return {
        ok: false,
        message: upload.message,
        fieldErrors: { image: upload.message },
      };
    }

    imageUrl = upload.url;
  } else if (payload.removeImage) {
    imageUrl = null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.menu.update({
        where: { id: existing.id },
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          imageUrl,
          price: data.price,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          optionGroups: {
            deleteMany: {},
            create: optionGroupWrites(data),
          },
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_UPDATED,
        entity: AUDIT_ENTITY.MENU,
        entityId: existing.id,
        metadata: {
          ...menuAuditMetadata(data),
          imageChanged: Boolean(payload.image) || Boolean(payload.removeImage),
        },
      });
    });

    revalidatePath("/admin/menu");
    revalidatePath(`/admin/menu/${existing.id}`);

    return { ok: true, message: "Menu berhasil diperbarui.", id: existing.id };
  } catch (error) {
    console.error("[menu] gagal memperbarui menu", error);

    return {
      ok: false,
      message: "Gagal menyimpan menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function setMenuActive(
  id: string,
  isActive: boolean,
): Promise<MenuActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Menu tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const menu = await tx.menu.findUnique({
        where: { id: idParsed.data },
        select: { id: true, name: true, isActive: true },
      });

      if (!menu) return null;
      if (menu.isActive === isActive) return { id: menu.id };

      await tx.menu.update({
        where: { id: menu.id },
        data: { isActive },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_UPDATED,
        entity: AUDIT_ENTITY.MENU,
        entityId: menu.id,
        metadata: { name: menu.name, isActive, change: "STATUS" },
      });

      return { id: menu.id };
    });

    if (!result) {
      return { ok: false, message: "Menu tidak ditemukan." };
    }

    revalidatePath("/admin/menu");
    revalidatePath(`/admin/menu/${result.id}`);

    return {
      ok: true,
      id: result.id,
      message: isActive ? "Menu diaktifkan." : "Menu dinonaktifkan.",
    };
  } catch (error) {
    console.error("[menu] gagal mengubah status menu", error);

    return {
      ok: false,
      message: "Gagal mengubah status menu. Coba lagi sebentar lagi.",
    };
  }
}

export async function deleteMenu(id: string): Promise<MenuActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = menuIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Menu tidak valid." };
  }

  const menu = await prisma.menu.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      name: true,
      _count: { select: { orderItems: true, vouchers: true } },
    },
  });

  if (!menu) {
    return { ok: false, message: "Menu tidak ditemukan." };
  }

  if (menu._count.orderItems + menu._count.vouchers > 0) {
    return {
      ok: false,
      message:
        "Menu sudah direferensikan pesanan atau voucher. Nonaktifkan saja agar riwayat tetap utuh.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.menu.delete({ where: { id: menu.id } });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.MENU_DELETED,
        entity: AUDIT_ENTITY.MENU,
        entityId: menu.id,
        metadata: { name: menu.name },
      });
    });

    revalidatePath("/admin/menu");

    return { ok: true, message: "Menu berhasil dihapus.", id: menu.id };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        message:
          "Menu sudah direferensikan pesanan atau voucher. Nonaktifkan saja agar riwayat tetap utuh.",
      };
    }

    console.error("[menu] gagal menghapus menu", error);

    return {
      ok: false,
      message: "Gagal menghapus menu. Coba lagi sebentar lagi.",
    };
  }
}
