import { z } from "zod";

import { orderCodeSchema } from "@/lib/order-code";

// Skema input modul belanja pelanggan (PRD §5.4, §8.7). Hanya id menu/opsi,
// jumlah, dan catatan yang berasal dari klien; harga otoritatif dihitung ulang
// di server (AGENTS.md aturan 1). Identitas pelanggan diambil dari sesi.

export const ORDER_ITEM_QUANTITY_MIN = 1;
export const ORDER_ITEM_QUANTITY_MAX = 100;
export const ORDER_MAX_LINES = 30;
export const ORDER_MAX_OPTIONS_PER_ITEM = 20;
export const ORDER_NOTE_MAX = 200;
export const SHOP_ID_MAX = 64;

function optionalText(max: number, error: string) {
  return z
    .string({ error })
    .trim()
    .max(max, { error })
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));
}

function shopIdSchema(error: string) {
  return z
    .string({ error })
    .trim()
    .min(1, { error })
    .max(SHOP_ID_MAX, { error });
}

export const shopItemSchema = z.object({
  menuId: shopIdSchema("Menu tidak valid."),
  quantity: z.coerce
    .number({ error: "Jumlah tidak valid." })
    .int({ error: "Jumlah harus bilangan bulat." })
    .min(ORDER_ITEM_QUANTITY_MIN, {
      error: `Jumlah minimal ${ORDER_ITEM_QUANTITY_MIN}.`,
    })
    .max(ORDER_ITEM_QUANTITY_MAX, {
      error: `Jumlah maksimal ${ORDER_ITEM_QUANTITY_MAX}.`,
    }),
  note: optionalText(
    ORDER_NOTE_MAX,
    `Catatan maksimal ${ORDER_NOTE_MAX} karakter.`,
  ),
  optionTagIds: z
    .array(shopIdSchema("Opsi tidak valid."), { error: "Opsi tidak valid." })
    .max(ORDER_MAX_OPTIONS_PER_ITEM, {
      error: `Maksimal ${ORDER_MAX_OPTIONS_PER_ITEM} opsi per item.`,
    })
    .default([]),
});

export type ShopItemInput = z.infer<typeof shopItemSchema>;

export const createOrderSchema = z.object({
  outletId: shopIdSchema("Outlet pengambilan tidak valid."),
  paymentAccountId: shopIdSchema("Rekening tujuan tidak valid."),
  voucherId: z
    .string({ error: "Voucher tidak valid." })
    .trim()
    .max(SHOP_ID_MAX, { error: "Voucher tidak valid." })
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  note: optionalText(
    ORDER_NOTE_MAX,
    `Catatan maksimal ${ORDER_NOTE_MAX} karakter.`,
  ),
  items: z
    .array(shopItemSchema, { error: "Keranjang tidak valid." })
    .min(1, { error: "Keranjang masih kosong." })
    .max(ORDER_MAX_LINES, {
      error: `Maksimal ${ORDER_MAX_LINES} jenis menu per pesanan.`,
    }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Pembatalan pesanan oleh pelanggan (hanya selama AWAITING_PAYMENT, PRD §8.7).
export const cancelOrderSchema = z.object({
  orderCode: orderCodeSchema,
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
