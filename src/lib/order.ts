import { z } from "zod";

import { OrderStatus } from "@/generated/prisma/enums";
import { orderCodeSchema } from "@/lib/order-code";

// Skema siklus hidup pesanan (PRD §5.5, §8.8): unggah bukti oleh pelanggan dan
// aksi kasir (konfirmasi/tolak/selesai). Alasan penolakan wajib diisi (PRD §8.8).

export const ORDER_ID_MAX = 64;
export const ORDER_REJECTION_REASON_MIN = 5;
export const ORDER_REJECTION_REASON_MAX = 300;

export const orderIdSchema = z
  .string({ error: "Pesanan tidak valid." })
  .trim()
  .min(1, { error: "Pesanan tidak valid." })
  .max(ORDER_ID_MAX, { error: "Pesanan tidak valid." });

export const orderStatusSchema = z.enum(OrderStatus, {
  error: "Status pesanan tidak valid.",
});

// Filter antrean pesanan kasir: salah satu status atau seluruhnya.
export const orderStatusFilterSchema = z.union([
  z.literal("ALL"),
  orderStatusSchema,
]);

export type OrderStatusFilter = z.infer<typeof orderStatusFilterSchema>;

// Unggah bukti transfer oleh pelanggan (PRD §5.4 fitur 6). Berkas gambar
// divalidasi terpisah lewat util Cloudinary; skema ini mengikat pesanannya.
export const uploadPaymentProofSchema = z.object({
  orderCode: orderCodeSchema,
});

export type UploadPaymentProofInput = z.infer<typeof uploadPaymentProofSchema>;

export const confirmOrderSchema = z.object({
  orderId: orderIdSchema,
});

export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;

export const rejectOrderSchema = z.object({
  orderId: orderIdSchema,
  rejectionReason: z
    .string({ error: "Alasan penolakan wajib diisi." })
    .trim()
    .min(ORDER_REJECTION_REASON_MIN, {
      error: `Alasan penolakan minimal ${ORDER_REJECTION_REASON_MIN} karakter.`,
    })
    .max(ORDER_REJECTION_REASON_MAX, {
      error: `Alasan penolakan maksimal ${ORDER_REJECTION_REASON_MAX} karakter.`,
    }),
});

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const completeOrderSchema = z.object({
  orderId: orderIdSchema,
});

export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;
