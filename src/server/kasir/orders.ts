"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import {
  OrderPaymentProofStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import {
  completeOrderSchema,
  confirmOrderSchema,
  rejectOrderSchema,
  type CompleteOrderInput,
  type ConfirmOrderInput,
  type RejectOrderInput,
} from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { isUserRole } from "@/lib/rbac";
import { recordAuditLog } from "@/server/admin/audit";
import { getSession } from "@/server/auth/session";

// Server Action aksi pesanan oleh kasir (PRD §5.5, §8.8). Kasir hanya dapat
// menindak pesanan outlet penugasannya. Konfirmasi pembayaran mengubah status
// pesanan, menerima bukti terakhir, menandai OrderPayment PAID, dan mengonsumsi
// voucher secara atomik (`WHERE status = 'ACTIVE'`) dalam satu transaksi —
// konfirmasi dibatalkan bila voucher sudah tidak aktif agar tidak pernah
// terjadi konsumsi ganda (PRD §8.8 edge case). Voucher tidak dikonsumsi saat
// penolakan/pembatalan.

export type OrderActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

// Galat internal untuk membatalkan transaksi (rollback) sekaligus membawa pesan
// ramah ke pemanggil.
class OrderActionError extends Error {}

type CashierContext =
  | { ok: true; userId: string; outletId: string }
  | { ok: false; message: string };

const UNAUTHORIZED_MESSAGE = "Sesi Anda telah berakhir. Silakan masuk kembali.";
const NO_OUTLET_MESSAGE =
  "Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin.";
const NOT_FOUND_MESSAGE =
  "Pesanan tidak ditemukan atau bukan untuk outlet Anda.";
const CONFLICT_MESSAGE =
  "Pesanan sudah diproses atau statusnya berubah. Muat ulang halaman.";

async function requireCashierOutlet(): Promise<CashierContext> {
  const session = await getSession();

  if (!session) return { ok: false, message: UNAUTHORIZED_MESSAGE };

  const role = isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    return { ok: false, message: UNAUTHORIZED_MESSAGE };
  }

  const cashier = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { outletId: true },
  });

  if (!cashier?.outletId) return { ok: false, message: NO_OUTLET_MESSAGE };

  return { ok: true, userId: session.user.id, outletId: cashier.outletId };
}

function revalidateOrderViews(orderId: string, orderCode: string): void {
  revalidatePath("/kasir/pesanan");
  revalidatePath(`/kasir/pesanan/${orderId}`);
  revalidatePath(`/kasir/pesanan/${orderCode}`);
}

export async function confirmOrder(
  input: ConfirmOrderInput,
): Promise<OrderActionResult> {
  const context = await requireCashierOutlet();

  if (!context.ok) return { ok: false, message: context.message };

  const parsed = confirmOrderSchema.safeParse(input);

  if (!parsed.success) return { ok: false, message: "Pesanan tidak valid." };

  const { orderId } = parsed.data;
  const now = new Date();

  try {
    const orderCode = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, outletId: context.outletId },
        select: {
          id: true,
          orderCode: true,
          status: true,
          voucherId: true,
        },
      });

      if (!order) throw new OrderActionError(NOT_FOUND_MESSAGE);
      if (order.status !== OrderStatus.AWAITING_CONFIRMATION) {
        throw new OrderActionError(CONFLICT_MESSAGE);
      }

      // Transisi kondisional: hanya satu kasir yang berhasil mengonfirmasi
      // (PRD §8.8 edge case dua kasir bersamaan).
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.AWAITING_CONFIRMATION },
        data: {
          status: OrderStatus.IN_PROGRESS,
          confirmedByCashierId: context.userId,
          confirmedAt: now,
        },
      });

      if (updated.count === 0) throw new OrderActionError(CONFLICT_MESSAGE);

      // Konsumsi voucher sekali pakai secara atomik; kegagalan membatalkan
      // seluruh konfirmasi (tidak ada diskon tanpa voucher sah).
      if (order.voucherId) {
        const consumed = await tx.voucher.updateMany({
          where: { id: order.voucherId, status: VoucherStatus.ACTIVE },
          data: {
            status: VoucherStatus.USED,
            usedAt: now,
            usedByCashierId: context.userId,
            usedAtOutletId: context.outletId,
          },
        });

        if (consumed.count === 0) {
          throw new OrderActionError(
            "Voucher pesanan ini sudah tidak aktif sehingga konfirmasi dibatalkan. Periksa kembali pesanan.",
          );
        }
      }

      // Bukti terakhir diterima.
      const latestProof = await tx.orderPaymentProof.findFirst({
        where: { orderId: order.id },
        orderBy: { uploadedAt: "desc" },
        select: { id: true },
      });

      if (latestProof) {
        await tx.orderPaymentProof.update({
          where: { id: latestProof.id },
          data: {
            status: OrderPaymentProofStatus.ACCEPTED,
            reviewedAt: now,
            reviewedByCashierId: context.userId,
          },
        });
      }

      await tx.orderPayment.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.PAID, paidAt: now },
      });

      await recordAuditLog(tx, {
        actorId: context.userId,
        action: AUDIT_ACTION.ORDER_CONFIRMED,
        entity: AUDIT_ENTITY.ORDER,
        entityId: order.id,
        metadata: { orderCode: order.orderCode },
      });

      return order.orderCode;
    });

    revalidateOrderViews(orderId, orderCode);

    return {
      ok: true,
      message: "Pembayaran dikonfirmasi. Pesanan mulai diproses.",
    };
  } catch (error) {
    if (error instanceof OrderActionError) {
      return { ok: false, message: error.message };
    }

    console.error("[kasir-pesanan] gagal mengonfirmasi pesanan", error);

    return {
      ok: false,
      message: "Gagal mengonfirmasi pesanan. Coba lagi sebentar lagi.",
    };
  }
}

export async function rejectOrder(
  input: RejectOrderInput,
): Promise<OrderActionResult> {
  const context = await requireCashierOutlet();

  if (!context.ok) return { ok: false, message: context.message };

  const parsed = rejectOrderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Alasan penolakan wajib diisi minimal 5 karakter.",
    };
  }

  const { orderId, rejectionReason } = parsed.data;
  const now = new Date();

  try {
    const orderCode = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, outletId: context.outletId },
        select: { id: true, orderCode: true, status: true },
      });

      if (!order) throw new OrderActionError(NOT_FOUND_MESSAGE);
      if (order.status !== OrderStatus.AWAITING_CONFIRMATION) {
        throw new OrderActionError(CONFLICT_MESSAGE);
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.AWAITING_CONFIRMATION },
        data: {
          status: OrderStatus.REJECTED,
          rejectionReason,
          rejectedByCashierId: context.userId,
          rejectedAt: now,
        },
      });

      if (updated.count === 0) throw new OrderActionError(CONFLICT_MESSAGE);

      // Bukti terakhir ditolak; voucher tetap ACTIVE sehingga bebas dipakai
      // lagi dan pesanan dapat diunggah ulang (PRD §8.8 edge case).
      const latestProof = await tx.orderPaymentProof.findFirst({
        where: { orderId: order.id },
        orderBy: { uploadedAt: "desc" },
        select: { id: true },
      });

      if (latestProof) {
        await tx.orderPaymentProof.update({
          where: { id: latestProof.id },
          data: {
            status: OrderPaymentProofStatus.REJECTED,
            rejectionReason,
            reviewedAt: now,
            reviewedByCashierId: context.userId,
          },
        });
      }

      await tx.orderPayment.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.FAILED },
      });

      await recordAuditLog(tx, {
        actorId: context.userId,
        action: AUDIT_ACTION.ORDER_REJECTED,
        entity: AUDIT_ENTITY.ORDER,
        entityId: order.id,
        metadata: { orderCode: order.orderCode, rejectionReason },
      });

      return order.orderCode;
    });

    revalidateOrderViews(orderId, orderCode);

    return {
      ok: true,
      message: "Pembayaran ditolak. Pelanggan dapat mengunggah ulang bukti.",
    };
  } catch (error) {
    if (error instanceof OrderActionError) {
      return { ok: false, message: error.message };
    }

    console.error("[kasir-pesanan] gagal menolak pesanan", error);

    return {
      ok: false,
      message: "Gagal menolak pesanan. Coba lagi sebentar lagi.",
    };
  }
}

export async function completeOrder(
  input: CompleteOrderInput,
): Promise<OrderActionResult> {
  const context = await requireCashierOutlet();

  if (!context.ok) return { ok: false, message: context.message };

  const parsed = completeOrderSchema.safeParse(input);

  if (!parsed.success) return { ok: false, message: "Pesanan tidak valid." };

  const { orderId } = parsed.data;
  const now = new Date();

  try {
    const orderCode = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, outletId: context.outletId },
        select: { id: true, orderCode: true, status: true },
      });

      if (!order) throw new OrderActionError(NOT_FOUND_MESSAGE);
      if (order.status !== OrderStatus.IN_PROGRESS) {
        throw new OrderActionError(CONFLICT_MESSAGE);
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.IN_PROGRESS },
        data: { status: OrderStatus.COMPLETED, completedAt: now },
      });

      if (updated.count === 0) throw new OrderActionError(CONFLICT_MESSAGE);

      await recordAuditLog(tx, {
        actorId: context.userId,
        action: AUDIT_ACTION.ORDER_COMPLETED,
        entity: AUDIT_ENTITY.ORDER,
        entityId: order.id,
        metadata: { orderCode: order.orderCode },
      });

      return order.orderCode;
    });

    revalidateOrderViews(orderId, orderCode);

    return { ok: true, message: "Pesanan ditandai selesai." };
  } catch (error) {
    if (error instanceof OrderActionError) {
      return { ok: false, message: error.message };
    }

    console.error("[kasir-pesanan] gagal menyelesaikan pesanan", error);

    return {
      ok: false,
      message: "Gagal menyelesaikan pesanan. Coba lagi sebentar lagi.",
    };
  }
}
