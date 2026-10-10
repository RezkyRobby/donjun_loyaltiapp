import type { Prisma } from "@/generated/prisma/client";
import type {
  OrderPaymentProofStatus,
  OrderStatus,
  PaymentAccountType,
  PaymentMethod,
  PaymentStatus,
  RewardBenefitType,
} from "@/generated/prisma/enums";
import { DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import {
  expireDueOrdersForCustomer,
  expireOrderIfDue,
} from "@/server/orders/expiry";

// Kueri pesanan belanja pelanggan (PRD §5.4 fitur 7). Kedaluwarsa ditegakkan
// secara *lazy* saat data diakses: pesanan `AWAITING_PAYMENT` yang lewat tenggat
// ditandai `EXPIRED` sebelum hasil dikembalikan (PRD §5.4 fitur 5). Daftar
// terpaginasi server-side (NFR §9).

export type CustomerOrderSummary = {
  id: string;
  orderCode: string;
  status: OrderStatus;
  total: number;
  paymentDueAt: Date;
  createdAt: Date;
  outletName: string;
  itemCount: number;
};

export type CustomerOrderPage = {
  orders: CustomerOrderSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export type CustomerOrderItemOption = {
  name: string;
  priceDelta: number;
};

export type CustomerOrderItem = {
  id: string;
  menuName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isFree: boolean;
  note: string | null;
  options: CustomerOrderItemOption[];
};

export type CustomerOrderProof = {
  id: string;
  imageUrl: string;
  status: OrderPaymentProofStatus;
  uploadedAt: Date;
  rejectionReason: string | null;
};

export type CustomerOrderPayment = {
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  provider: string | null;
  account: {
    type: PaymentAccountType;
    providerName: string;
    accountNumber: string | null;
    accountHolder: string | null;
    imageUrl: string | null;
  } | null;
};

export type CustomerOrderDetail = {
  id: string;
  orderCode: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentDueAt: Date;
  note: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  outletName: string;
  outletAddress: string;
  voucher: {
    voucherCode: string;
    rewardTitle: string;
    benefitType: RewardBenefitType;
  } | null;
  items: CustomerOrderItem[];
  payment: CustomerOrderPayment | null;
  proofs: CustomerOrderProof[];
};

const ORDER_LIST_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  total: true,
  paymentDueAt: true,
  createdAt: true,
  outlet: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const ORDER_DETAIL_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  subtotal: true,
  discountAmount: true,
  total: true,
  paymentDueAt: true,
  note: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  outlet: { select: { name: true, address: true } },
  voucher: {
    select: { voucherCode: true, rewardTitle: true, benefitType: true },
  },
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      menuName: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      isFree: true,
      note: true,
      options: { select: { name: true, priceDelta: true } },
    },
  },
  payments: {
    orderBy: { createdAt: "asc" },
    select: {
      status: true,
      method: true,
      amount: true,
      provider: true,
      paymentAccount: {
        select: {
          type: true,
          providerName: true,
          accountNumber: true,
          accountHolder: true,
          imageUrl: true,
        },
      },
    },
  },
  proofs: {
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      status: true,
      uploadedAt: true,
      rejectionReason: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderListRow = Prisma.OrderGetPayload<{ select: typeof ORDER_LIST_SELECT }>;
type OrderDetailRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_DETAIL_SELECT;
}>;

function toSummary(row: OrderListRow): CustomerOrderSummary {
  return {
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    total: row.total,
    paymentDueAt: row.paymentDueAt,
    createdAt: row.createdAt,
    outletName: row.outlet.name,
    itemCount: row._count.items,
  };
}

function toDetail(row: OrderDetailRow): CustomerOrderDetail {
  const payment = row.payments[0] ?? null;

  return {
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    subtotal: row.subtotal,
    discountAmount: row.discountAmount,
    total: row.total,
    paymentDueAt: row.paymentDueAt,
    note: row.note,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    outletName: row.outlet.name,
    outletAddress: row.outlet.address,
    voucher: row.voucher,
    items: row.items.map((item) => ({
      id: item.id,
      menuName: item.menuName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      isFree: item.isFree,
      note: item.note,
      options: item.options.map((option) => ({
        name: option.name,
        priceDelta: option.priceDelta,
      })),
    })),
    payment: payment
      ? {
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          provider: payment.provider,
          account: payment.paymentAccount,
        }
      : null,
    proofs: row.proofs,
  };
}

export async function getCustomerOrders(
  userId: string,
  page = 1,
): Promise<CustomerOrderPage> {
  await expireDueOrdersForCustomer(userId);

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: ORDER_LIST_SELECT,
    }),
    prisma.order.count({ where: { customerId: userId } }),
  ]);

  return {
    orders: rows.map(toSummary),
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}

export async function getCustomerOrderByCode(
  userId: string,
  orderCode: string,
): Promise<CustomerOrderDetail | null> {
  const existing = await prisma.order.findFirst({
    where: { orderCode, customerId: userId },
    select: { id: true },
  });

  if (!existing) return null;

  await expireOrderIfDue(existing.id);

  const row = await prisma.order.findUnique({
    where: { id: existing.id },
    select: ORDER_DETAIL_SELECT,
  });

  return row ? toDetail(row) : null;
}
