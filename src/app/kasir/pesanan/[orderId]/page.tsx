import {
  ChevronLeft,
  CircleCheck,
  CircleX,
  Hourglass,
  Images,
  Ticket,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormAlert } from "@/components/auth/form-alert";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PaymentDeadline } from "@/components/customer/payment-deadline";
import { OrderDecisionActions } from "@/components/kasir/order-decision-actions";
import {
  ORDER_PAYMENT_PROOF_STATUS_LABELS,
  PAYMENT_ACCOUNT_TYPE_LABELS,
  REWARD_BENEFIT_TYPE_LABELS,
} from "@/constants/labels";
import {
  OrderPaymentProofStatus,
  OrderStatus,
} from "@/generated/prisma/enums";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/session";
import {
  getCashierOrderDetail,
  type CashierOrderPayment,
} from "@/server/kasir/order-list";

export const metadata: Metadata = { title: "Detail Pesanan" };

// Peta status bukti transfer (design.md §8): warna + ikon + label dari kamus
// terpusat, tidak pernah warna saja.
const PROOF_STATUS_STYLES: Record<
  OrderPaymentProofStatus,
  { icon: LucideIcon; className: string }
> = {
  [OrderPaymentProofStatus.PENDING]: {
    icon: Hourglass,
    className: "border-sky-pastel bg-sky-pastel/60 text-brand-brown-dark",
  },
  [OrderPaymentProofStatus.ACCEPTED]: {
    icon: CircleCheck,
    className:
      "border-donut-matcha/40 bg-donut-matcha/10 text-donut-matcha-deep",
  },
  [OrderPaymentProofStatus.REJECTED]: {
    icon: CircleX,
    className: "border-donut-berry/40 bg-donut-berry/10 text-donut-berry-deep",
  },
};

// Tujuan transfer yang dipakai pelanggan, ditampilkan agar kasir dapat
// mencocokkan bukti dengan rekening (PRD §5.5 fitur 2).
function PaymentAccountCard({
  account,
}: {
  account: NonNullable<CashierOrderPayment["account"]>;
}) {
  return (
    <section
      aria-labelledby="tujuan-transfer-judul"
      className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
    >
      <h2
        id="tujuan-transfer-judul"
        className="font-display text-base font-semibold text-brand-brown-dark"
      >
        Tujuan transfer
      </h2>
      <div className="flex flex-col gap-2 rounded-button border border-sky-pastel bg-sky-pastel/50 p-4 text-sm text-brand-brown-dark">
        <p className="font-medium">{account.providerName}</p>
        <dl className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-brown-muted">Jenis</dt>
            <dd>{PAYMENT_ACCOUNT_TYPE_LABELS[account.type]}</dd>
          </div>
          {account.accountNumber ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-brand-brown-muted">Nomor</dt>
              <dd className="tabular-nums">{account.accountNumber}</dd>
            </div>
          ) : null}
          {account.accountHolder ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-brand-brown-muted">Atas nama</dt>
              <dd>{account.accountHolder}</dd>
            </div>
          ) : null}
        </dl>
        {account.imageUrl ? (
          <div className="relative mx-auto mt-1 aspect-square w-full max-w-56 overflow-hidden rounded-button border border-warm-border bg-brand-white">
            <Image
              src={account.imageUrl}
              alt={`Kode QRIS ${account.providerName}`}
              fill
              sizes="224px"
              className="object-contain"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default async function KasirPesananDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await requireStaff();
  const { orderId } = await params;

  const cashier = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { outletId: true },
  });

  if (!cashier?.outletId) {
    return (
      <section className="flex flex-col gap-6">
        <Link
          href="/kasir/pesanan"
          className="inline-flex h-11 w-fit items-center gap-1 rounded-button px-2 text-sm font-medium text-brand-orange-deep transition-colors hover:bg-warm-neutral focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Antrean pesanan
        </Link>
        <FormAlert tone="info">
          Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin agar detail
          pesanan dapat diakses.
        </FormAlert>
      </section>
    );
  }

  const order = await getCashierOrderDetail(cashier.outletId, orderId);

  if (!order) notFound();

  const paymentAccount = order.payment?.account ?? null;
  const showPaymentAccount =
    paymentAccount != null &&
    (order.status === OrderStatus.AWAITING_CONFIRMATION ||
      order.status === OrderStatus.IN_PROGRESS ||
      order.status === OrderStatus.COMPLETED);

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/kasir/pesanan"
        className="inline-flex h-11 w-fit items-center gap-1 rounded-button px-2 text-sm font-medium text-brand-orange-deep transition-colors hover:bg-warm-neutral focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Antrean pesanan
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-mono text-lg font-bold uppercase tracking-[0.08em] text-brand-brown-dark">
            {order.orderCode}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-brand-brown-muted">
          <UserRound aria-hidden className="size-4 shrink-0" />
          <span className="font-medium text-brand-brown-dark">
            {order.customerName}
          </span>
          {order.customerUsername ? <span>@{order.customerUsername}</span> : null}
        </p>
      </div>

      {order.status === OrderStatus.AWAITING_PAYMENT ? (
        <FormAlert tone="info">
          Pelanggan belum mengunggah bukti transfer. Tenggat pembayaran masih
          berjalan.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.AWAITING_CONFIRMATION ? (
        <FormAlert tone="info">
          Bukti transfer menunggu keputusan Anda. Periksa bukti, lalu konfirmasi
          atau tolak.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.IN_PROGRESS ? (
        <FormAlert tone="info">
          Pembayaran telah dikonfirmasi dan pesanan sedang diproses. Tandai
          selesai setelah pesanan siap diambil.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.COMPLETED ? (
        <FormAlert tone="success">
          Pesanan selesai. Pembayaran telah diterima.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.REJECTED ? (
        <FormAlert tone="error">
          Bukti transfer ditolak
          {order.rejectionReason ? `: ${order.rejectionReason}` : ""}. Pelanggan
          dapat mengunggah ulang bukti.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.EXPIRED ? (
        <FormAlert tone="info">
          Pesanan kedaluwarsa karena tenggat pembayaran terlewat tanpa bukti.
          Voucher yang ditempel tetap dapat dipakai pelanggan.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.CANCELED ? (
        <FormAlert tone="info">Pesanan dibatalkan oleh pelanggan.</FormAlert>
      ) : null}

      <section
        aria-labelledby="informasi-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
      >
        <h2
          id="informasi-judul"
          className="font-display text-base font-semibold text-brand-brown-dark"
        >
          Informasi pesanan
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-brown-muted">Dibuat</dt>
            <dd className="text-brand-brown-dark">
              {formatDateTimeWita(order.createdAt)} WITA
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-brown-muted">Diperbarui</dt>
            <dd className="text-brand-brown-dark">
              {formatDateTimeWita(order.updatedAt)} WITA
            </dd>
          </div>
        </dl>
        {order.status === OrderStatus.AWAITING_PAYMENT ? (
          <PaymentDeadline paymentDueAt={order.paymentDueAt} />
        ) : null}
      </section>

      <section
        aria-labelledby="rincian-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
      >
        <h2
          id="rincian-judul"
          className="font-display text-base font-semibold text-brand-brown-dark"
        >
          Rincian pesanan
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-brand-brown-dark">
                  {item.menuName}
                  {item.isFree ? (
                    <span className="ml-2 rounded-badge bg-donut-matcha/15 px-2 py-0.5 text-caption font-medium text-donut-matcha-deep">
                      Gratis
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-brand-brown-dark">
                  {item.quantity} x{" "}
                  {formatRupiah(item.isFree ? 0 : item.unitPrice)}
                </span>
              </div>
              {item.options.length > 0 ? (
                <p className="text-caption text-brand-brown-muted">
                  {item.options
                    .map((option) =>
                      option.priceDelta > 0
                        ? `${option.name} (+${formatRupiah(option.priceDelta)})`
                        : option.name,
                    )
                    .join(", ")}
                </p>
              ) : null}
              {item.note ? (
                <p className="text-caption text-brand-brown-muted">
                  Catatan: {item.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        {order.voucher ? (
          <div className="flex items-start gap-2 rounded-button border border-warm-border bg-warm-neutral/60 p-3 text-sm">
            <Ticket
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-brand-orange-deep"
            />
            <div className="flex flex-col">
              <span className="font-medium text-brand-brown-dark">
                {order.voucher.rewardTitle}
              </span>
              <span className="text-caption text-brand-brown-muted">
                {REWARD_BENEFIT_TYPE_LABELS[order.voucher.benefitType]} ·{" "}
                {order.voucher.voucherCode}
              </span>
            </div>
          </div>
        ) : null}

        {order.note ? (
          <p className="text-sm text-brand-brown-muted">
            Catatan pesanan: {order.note}
          </p>
        ) : null}

        <dl className="flex flex-col gap-2 border-t border-warm-border pt-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-brown-muted">Subtotal</dt>
            <dd className="font-medium tabular-nums text-brand-brown-dark">
              {formatRupiah(order.subtotal)}
            </dd>
          </div>
          {order.discountAmount > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-donut-matcha-deep">Potongan voucher</dt>
              <dd className="font-medium tabular-nums text-donut-matcha-deep">
                -{formatRupiah(order.discountAmount)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-t border-warm-border pt-2">
            <dt className="font-medium text-brand-brown-dark">Total bayar</dt>
            <dd className="font-display text-xl font-bold tabular-nums text-brand-brown-dark">
              {formatRupiah(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      {showPaymentAccount && paymentAccount ? (
        <PaymentAccountCard account={paymentAccount} />
      ) : null}

      {order.proofs.length > 0 ? (
        <section
          aria-labelledby="bukti-judul"
          className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
        >
          <h2
            id="bukti-judul"
            className="font-display text-base font-semibold text-brand-brown-dark"
          >
            Bukti transfer
          </h2>
          <ul className="flex flex-col gap-4">
            {order.proofs.map((proof, index) => {
              const proofStatus = PROOF_STATUS_STYLES[proof.status];
              const ProofIcon = proofStatus.icon;

              return (
                <li key={proof.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[3/4] w-full max-w-56 overflow-hidden rounded-button border border-warm-border bg-brand-white">
                    <Image
                      src={proof.imageUrl}
                      alt={
                        index === 0
                          ? "Bukti transfer terbaru yang diunggah pelanggan"
                          : "Bukti transfer yang diunggah pelanggan"
                      }
                      fill
                      sizes="224px"
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-badge border px-3 py-1 text-caption font-medium",
                        proofStatus.className,
                      )}
                    >
                      <ProofIcon aria-hidden className="size-4" />
                      {ORDER_PAYMENT_PROOF_STATUS_LABELS[proof.status]}
                    </span>
                    <span className="text-caption text-brand-brown-muted">
                      {formatDateTimeWita(proof.uploadedAt)} WITA
                      {index === 0 ? " · terbaru" : ""}
                    </span>
                  </div>
                  {proof.rejectionReason ? (
                    <p className="text-caption text-donut-berry-deep">
                      Alasan penolakan: {proof.rejectionReason}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : order.status === OrderStatus.AWAITING_CONFIRMATION ? (
        <div className="flex items-start gap-2 rounded-card border border-warm-border bg-card p-4 text-sm text-brand-brown-muted">
          <Images aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Belum ada bukti transfer yang terlampir pada pesanan ini.
          </span>
        </div>
      ) : null}

      <section
        aria-labelledby="keputusan-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
      >
        <h2
          id="keputusan-judul"
          className="font-display text-base font-semibold text-brand-brown-dark"
        >
          Keputusan kasir
        </h2>
        <OrderDecisionActions
          orderId={order.id}
          orderCode={order.orderCode}
          status={order.status}
        />
      </section>
    </section>
  );
}
