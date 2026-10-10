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
import type { OrderStatusFilter } from "@/lib/order";
import { expireDueOrdersForOutlet, expireOrderIfDue } from "@/server/orders/expiry";

// Kueri antrean & detail pesanan untuk kasir (PRD §5.5). Kasir hanya melihat
// pesanan outlet penugasannya; identitas pelanggan dibatasi nama & username
// (PRD §10). Kedaluwarsa ditegakkan *lazy* saat data diakses (PRD §5.4 fitur 5).

export type CashierOrderSummary = {
  id: string;
  orderCode: string;
  status: OrderStatus;
  customerName: string;
  customerUsername: string | null;
  total: number;
  itemCount: number;
  proofCount: number;
  paymentDueAt: Date;
  createdAt: Date;
};

export type CashierOrderPage = {
  orders: CashierOrderSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export type CashierOrderItemOption = {
  name: string;
  priceDelta: number;
};

export type CashierOrderItem = {
  id: string;
  menuName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isFree: boolean;
  note: string | null;
  options: CashierOrderItemOption[];
};

export type CashierOrderProof = {
  id: string;
  imageUrl: string;
  status: OrderPaymentProofStatus;
  uploadedAt: Date;
  rejectionReason: string | null;
};

export type CashierOrderPayment = {
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

export type CashierOrderDetail = {
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
  customerName: string;
  customerUsername: string | null;
  voucher: {
    voucherCode: string;
    rewardTitle: string;
    benefitType: RewardBenefitType;
  } | null;
  items: CashierOrderItem[];
  payment: CashierOrderPayment | null;
  proofs: CashierOrderProof[];
};

const ORDER_LIST_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  total: true,
  paymentDueAt: true,
  createdAt: true,
  customer: { select: { name: true, username: true } },
  _count: { select: { items: true, proofs: true } },
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
  customer: { select: { name: true, username: true } },
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

function toSummary(row: OrderListRow): CashierOrderSummary {
  return {
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    customerName: row.customer.name,
    customerUsername: row.customer.username,
    total: row.total,
    itemCount: row._count.items,
    proofCount: row._count.proofs,
    paymentDueAt: row.paymentDueAt,
    createdAt: row.createdAt,
  };
}

function toDetail(row: OrderDetailRow): CashierOrderDetail {
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
    customerName: row.customer.name,
    customerUsername: row.customer.username,
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

export async function getCashierOrders(
  outletId: string,
  statusFilter: OrderStatusFilter = "ALL",
  page = 1,
): Promise<CashierOrderPage> {
  await expireDueOrdersForOutlet(outletId);

  const where: Prisma.OrderWhereInput = { outletId };
  if (statusFilter !== "ALL") where.status = statusFilter;

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageOffset(page, DEFAULT_PAGE_SIZE),
      take: DEFAULT_PAGE_SIZE,
      select: ORDER_LIST_SELECT,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: rows.map(toSummary),
    page,
    totalPages: Math.max(Math.ceil(total / DEFAULT_PAGE_SIZE), 1),
    total,
  };
}

export async function getCashierOrderDetail(
  outletId: string,
  orderId: string,
): Promise<CashierOrderDetail | null> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, outletId },
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
