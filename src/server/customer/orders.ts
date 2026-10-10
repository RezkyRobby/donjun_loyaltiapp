"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { Prisma } from "@/generated/prisma/client";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  VoucherStatus,
} from "@/generated/prisma/enums";
import type { RewardBenefitType } from "@/generated/prisma/enums";
import { generateOrderCode } from "@/lib/order-code";
import { getPaymentDueAt } from "@/lib/payment-window";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  cancelOrderSchema,
  createOrderSchema,
  type CancelOrderInput,
  type CreateOrderInput,
} from "@/lib/shop";
import {
  calculateShopTotals,
  type ShopPricedItem,
  type VoucherBenefitSnapshot,
} from "@/lib/shop-pricing";
import { recordAuditLog } from "@/server/admin/audit";
import { getSession } from "@/server/auth/session";

// Server Action pembuatan & pembatalan pesanan belanja pelanggan (PRD §5.4,
// §8.7). Seluruh harga dan potongan dihitung ulang dari data menu terkini —
// harga dari klien diabaikan (AGENTS.md aturan 1). Pembuatan pesanan berjalan
// dalam satu transaksi: baris `Voucher` dikunci (row lock) agar satu voucher
// tidak dapat ditempelkan ke dua pesanan aktif, lalu `Order`, `OrderItem`,
// `OrderItemOption`, dan `OrderPayment` dibuat; voucher tetap `ACTIVE` (belum
// dikonsumsi). Voucher baru dikonsumsi kasir saat konfirmasi pembayaran.

export type CreateOrderResult =
  | { ok: true; orderCode: string }
  | { ok: false; message: string; retryAfterSeconds?: number };

export type CancelOrderResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

// Pesanan yang masih mengunci voucher: selama salah satu status ini aktif,
// voucher tidak boleh ditempelkan ke pesanan lain (PRD §8.7 edge case).
const ACTIVE_ORDER_STATUSES = [
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.AWAITING_CONFIRMATION,
  OrderStatus.IN_PROGRESS,
];

// Percobaan ulang untuk tabrakan kode pesanan (P2002) dan konflik transaksi
// (P2034).
const MAX_PERCOBAAN = 5;

// Rate limit pembuatan pesanan: maks 10 per jam per pelanggan (NFR §9).
const orderCreationLimiter = createRateLimiter(RATE_LIMITS.orderCreation);

type LockedVoucher = {
  id: string;
  status: VoucherStatus;
  benefitType: RewardBenefitType;
  discountPercent: number | null;
  discountAmount: number | null;
  linkedMenuId: string | null;
  linkedMenuName: string | null;
  linkedMenuPrice: number | null;
};

const MENU_NOT_AVAILABLE =
  "Beberapa menu tidak tersedia lagi. Perbarui keranjang Anda.";
const VOUCHER_IN_USE =
  "Voucher sudah dipakai pada pesanan aktif lain. Pilih voucher lain.";
const ORDER_NOT_CANCELABLE =
  "Pesanan hanya dapat dibatalkan selama menunggu pembayaran.";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const session = await getSession();

  if (!session || session.user.role !== UserRole.CUSTOMER) {
    return {
      ok: false,
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const userId = session.user.id;

  const rate = orderCreationLimiter.consume(userId);

  if (!rate.allowed) {
    return {
      ok: false,
      message: "Anda membuat terlalu banyak pesanan. Coba lagi nanti.",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  const parsed = createOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali pesanan Anda." };
  }

  const data = parsed.data;

  for (let attempt = 1; attempt <= MAX_PERCOBAAN; attempt += 1) {
    const orderCode = generateOrderCode();

    try {
      return await prisma.$transaction(
        async (tx): Promise<CreateOrderResult> => {
          // Status akun dibaca ulang di dalam transaksi: akun yang ditangguhkan
          // tidak boleh membuat pesanan baru.
          const customer = await tx.user.findUnique({
            where: { id: userId },
            select: { role: true, isActive: true },
          });

          if (!customer || customer.role !== UserRole.CUSTOMER) {
            return {
              ok: false,
              message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
            };
          }

          if (!customer.isActive) {
            return {
              ok: false,
              message:
                "Akun Anda sedang ditangguhkan sehingga tidak dapat membuat pesanan.",
            };
          }

          const outlet = await tx.outlet.findFirst({
            where: { id: data.outletId, isActive: true },
            select: { id: true },
          });

          if (!outlet) {
            return { ok: false, message: "Outlet pengambilan tidak tersedia." };
          }

          const paymentAccount = await tx.paymentAccount.findFirst({
            where: { id: data.paymentAccountId, isActive: true },
            select: { id: true },
          });

          if (!paymentAccount) {
            return {
              ok: false,
              message: "Rekening tujuan pembayaran tidak tersedia.",
            };
          }

          // Harga otoritatif diambil dari data menu terkini; menu nonaktif atau
          // hilang membuat pesanan ditolak (PRD §8.7 edge case).
          const menuIds = Array.from(
            new Set(data.items.map((item) => item.menuId)),
          );
          const menus = await tx.menu.findMany({
            where: { id: { in: menuIds }, isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              optionGroups: {
                select: {
                  tags: { select: { id: true, name: true, priceDelta: true } },
                },
              },
            },
          });

          if (menus.length !== menuIds.length) {
            return { ok: false, message: MENU_NOT_AVAILABLE };
          }

          const menuMap = new Map(menus.map((menu) => [menu.id, menu]));
          const pricedItems: ShopPricedItem[] = [];

          for (const item of data.items) {
            const menu = menuMap.get(item.menuId);

            if (!menu) {
              return { ok: false, message: MENU_NOT_AVAILABLE };
            }

            const tagMap = new Map(
              menu.optionGroups.flatMap((group) =>
                group.tags.map((tag) => [tag.id, tag] as const),
              ),
            );
            const options: ShopPricedItem["options"] = [];

            for (const tagId of item.optionTagIds) {
              const tag = tagMap.get(tagId);

              if (!tag) {
                return {
                  ok: false,
                  message: `Opsi pada menu ${menu.name} tidak valid. Perbarui keranjang Anda.`,
                };
              }

              options.push({
                tagId,
                name: tag.name,
                priceDelta: tag.priceDelta,
              });
            }

            pricedItems.push({
              menuId: menu.id,
              menuName: menu.name,
              unitPrice: menu.price,
              quantity: item.quantity,
              note: item.note,
              options,
            });
          }

          let voucherSnapshot: VoucherBenefitSnapshot | null = null;

          if (data.voucherId) {
            // Kunci baris voucher (row lock) sehingga pemeriksaan "voucher
            // dipakai pesanan lain" and pembuatan pesanan tidak balapan.
            const locked = await tx.$queryRaw<LockedVoucher[]>`
              SELECT "id", "status", "benefitType", "discountPercent", "discountAmount",
                     "linkedMenuId", "linkedMenuName", "linkedMenuPrice"
              FROM "Voucher"
              WHERE "id" = ${data.voucherId} AND "userId" = ${userId}
              FOR UPDATE
            `;
            const voucher = locked[0];

            if (!voucher) {
              return { ok: false, message: "Voucher tidak ditemukan." };
            }

            if (voucher.status !== VoucherStatus.ACTIVE) {
              return {
                ok: false,
                message: "Voucher sudah tidak aktif dan tidak dapat dipakai.",
              };
            }

            const usedOnActiveOrder = await tx.order.count({
              where: {
                voucherId: voucher.id,
                status: { in: ACTIVE_ORDER_STATUSES },
              },
            });

            if (usedOnActiveOrder > 0) {
              return { ok: false, message: VOUCHER_IN_USE };
            }

            voucherSnapshot = {
              benefitType: voucher.benefitType,
              discountPercent: voucher.discountPercent,
              discountAmount: voucher.discountAmount,
              linkedMenuId: voucher.linkedMenuId,
              linkedMenuName: voucher.linkedMenuName,
              linkedMenuPrice: voucher.linkedMenuPrice,
            };
          }

          const totals = calculateShopTotals(pricedItems, voucherSnapshot);
          const paymentDueAt = getPaymentDueAt(new Date());

          await tx.order.create({
            data: {
              orderCode,
              customerId: userId,
              outletId: outlet.id,
              status: OrderStatus.AWAITING_PAYMENT,
              subtotal: totals.subtotal,
              discountAmount: totals.discountAmount,
              total: totals.total,
              paymentDueAt,
              note: data.note,
              // Voucher ditempel namun TIDAK dikonsumsi (tetap ACTIVE).
              voucherId: data.voucherId,
              items: {
                create: totals.lines.map((line) => ({
                  menuId: line.menuId,
                  menuName: line.menuName,
                  unitPrice: line.unitPrice,
                  quantity: line.quantity,
                  isFree: line.isFree,
                  note: line.note,
                  lineTotal: line.lineTotal,
                  options: {
                    create: line.options.map((option) => ({
                      tagId: option.tagId,
                      name: option.name,
                      priceDelta: option.priceDelta,
                    })),
                  },
                })),
              },
              payments: {
                create: {
                  method: PaymentMethod.MANUAL_TRANSFER,
                  status: PaymentStatus.PENDING,
                  amount: totals.total,
                  paymentAccountId: paymentAccount.id,
                },
              },
            },
            select: { id: true },
          });

          return { ok: true, orderCode };
        },
      );
    } catch (error) {
      if (isUniqueConstraintError(error) || isTransactionConflict(error)) {
        continue;
      }

      console.error("[belanja] gagal membuat pesanan", error);

      return {
        ok: false,
        message: "Gagal membuat pesanan. Coba lagi sebentar lagi.",
      };
    }
  }

  return {
    ok: false,
    message: "Sistem sedang sibuk. Coba lagi sebentar lagi.",
  };
}

export async function cancelOrder(
  input: CancelOrderInput,
): Promise<CancelOrderResult> {
  const session = await getSession();

  if (!session || session.user.role !== UserRole.CUSTOMER) {
    return {
      ok: false,
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const userId = session.user.id;

  const parsed = cancelOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  const { orderCode } = parsed.data;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<CancelOrderResult> => {
        const order = await tx.order.findFirst({
          where: { orderCode, customerId: userId },
          select: { id: true, status: true },
        });

        if (!order) {
          return { ok: false, message: "Pesanan tidak ditemukan." };
        }

        if (order.status !== OrderStatus.AWAITING_PAYMENT) {
          return { ok: false, message: ORDER_NOT_CANCELABLE };
        }

        // Pembaruan kondisional: hanya menandai CANCELED bila status masih
        // AWAITING_PAYMENT, sehingga pembatalan tidak balapan dengan konfirmasi
        // kasir atau kedaluwarsa (AGENTS.md aturan 3).
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT },
          data: { status: OrderStatus.CANCELED },
        });

        if (updated.count === 0) {
          return { ok: false, message: ORDER_NOT_CANCELABLE };
        }

        // Voucher tidak dikonsumsi — tetap ACTIVE dan bebas dipakai lagi.
        await recordAuditLog(tx, {
          actorId: userId,
          action: AUDIT_ACTION.ORDER_CANCELED,
          entity: AUDIT_ENTITY.ORDER,
          entityId: order.id,
          metadata: { orderCode },
        });

        return { ok: true, message: "Pesanan berhasil dibatalkan." };
      },
    );

    if (result.ok) {
      revalidatePath("/pesanan");
      revalidatePath(`/pesanan/${orderCode}`);
    }

    return result;
  } catch (error) {
    console.error("[belanja] gagal membatalkan pesanan", error);

    return {
      ok: false,
      message: "Gagal membatalkan pesanan. Coba lagi sebentar lagi.",
    };
  }
}
