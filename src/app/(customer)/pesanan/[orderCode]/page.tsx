import {
  ChevronLeft,
  CircleCheck,
  CircleX,
  Hourglass,
  MapPin,
  Store,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormAlert } from "@/components/auth/form-alert";
import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PaymentDeadline } from "@/components/customer/payment-deadline";
import { UploadProofForm } from "@/components/customer/upload-proof-form";
import { Button } from "@/components/ui/button";
import {
  ORDER_PAYMENT_PROOF_STATUS_LABELS,
  PAYMENT_ACCOUNT_TYPE_LABELS,
  REWARD_BENEFIT_TYPE_LABELS,
} from "@/constants/labels";
import { OrderStatus, OrderPaymentProofStatus } from "@/generated/prisma/enums";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireCustomer } from "@/server/auth/session";
import {
  getCustomerOrderByCode,
  type CustomerOrderPayment,
} from "@/server/customer/order-list";

export const metadata: Metadata = { title: "Detail pesanan" };

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

function PaymentInstructions({
  account,
}: {
  account: CustomerOrderPayment["account"];
}) {
  if (!account) return null;

  return (
    <div className="flex flex-col gap-2 rounded-button border border-sky-pastel bg-sky-pastel/50 p-4 text-sm text-brand-brown-dark">
      <p className="font-display text-base font-semibold">Tujuan transfer</p>
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
      <p className="text-caption text-brand-brown-muted">
        Transfer sesuai total, lalu unggah bukti transfer pada halaman ini.
      </p>
    </div>
  );
}

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const session = await requireCustomer();
  const { orderCode } = await params;
  const order = await getCustomerOrderByCode(session.user.id, orderCode);

  if (!order) notFound();

  const canUploadProof =
    order.status === OrderStatus.AWAITING_PAYMENT ||
    order.status === OrderStatus.REJECTED;
  const showPaymentInstructions =
    order.status === OrderStatus.AWAITING_PAYMENT ||
    order.status === OrderStatus.REJECTED;

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/pesanan"
        className="inline-flex h-11 w-fit items-center gap-1 rounded-button px-2 text-sm font-medium text-brand-orange-deep transition-colors hover:bg-warm-neutral focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Pesanan
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-mono text-lg font-bold uppercase tracking-[0.08em] text-brand-brown-dark">
            {order.orderCode}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-brand-brown-muted">
          Dibuat {formatDateTimeWita(order.createdAt)} WITA
        </p>
      </div>

      <section
        aria-labelledby="pengambilan-judul"
        className="flex flex-col gap-2 rounded-card border border-warm-border bg-card p-4 shadow-card"
      >
        <h2
          id="pengambilan-judul"
          className="font-display text-base font-semibold text-brand-brown-dark"
        >
          Outlet pengambilan
        </h2>
        <p className="flex items-center gap-2 text-sm font-medium text-brand-brown-dark">
          <Store aria-hidden className="size-4 shrink-0" />
          {order.outletName}
        </p>
        <p className="flex items-start gap-2 text-sm text-brand-brown-muted">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          {order.outletAddress}
        </p>
      </section>

      {order.status === OrderStatus.AWAITING_PAYMENT ? (
        <div className="flex flex-col gap-2">
          <FormAlert tone="info">
            Selesaikan pembayaran sebelum tenggat, lalu unggah bukti transfer.
          </FormAlert>
          <PaymentDeadline paymentDueAt={order.paymentDueAt} />
        </div>
      ) : null}

      {order.status === OrderStatus.AWAITING_CONFIRMATION ? (
        <FormAlert tone="info">
          Bukti transfer Anda sedang ditinjau kasir. Tenggat pembayaran tidak
          lagi berlaku.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.IN_PROGRESS ? (
        <FormAlert tone="info">
          Pesanan sedang diproses. Silakan ambil di outlet saat pesanan siap.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.COMPLETED ? (
        <FormAlert tone="success">
          Pesanan selesai. Terima kasih telah berbelanja di Donjun Donat.
        </FormAlert>
      ) : null}

      {order.status === OrderStatus.CANCELED ? (
        <FormAlert tone="info">Pesanan ini telah dibatalkan.</FormAlert>
      ) : null}

      {order.status === OrderStatus.EXPIRED ? (
        <div className="flex flex-col gap-3">
          <FormAlert tone="error">
            Pesanan kedaluwarsa karena tenggat pembayaran terlewat. Voucher yang
            ditempel tetap dapat digunakan.
          </FormAlert>
          <Button asChild className="h-12 w-full">
            <Link href="/belanja">Buat pesanan baru</Link>
          </Button>
        </div>
      ) : null}

      {order.status === OrderStatus.REJECTED ? (
        <FormAlert tone="error">
          Bukti transfer ditolak
          {order.rejectionReason ? `: ${order.rejectionReason}` : ""}. Silakan
          unggah ulang bukti transfer yang benar.
        </FormAlert>
      ) : null}

      <section
        aria-labelledby="rincian-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
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
                  {formatRupiah(
                    item.isFree ? 0 : item.unitPrice,
                  )}
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
            <Ticket aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-orange-deep" />
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

      {showPaymentInstructions ? (
        <PaymentInstructions account={order.payment?.account ?? null} />
      ) : null}

      {order.status === OrderStatus.REJECTED ? (
        <PaymentDeadline paymentDueAt={order.paymentDueAt} />
      ) : null}

      {canUploadProof ? (
        <section
          aria-labelledby="unggah-bukti-judul"
          className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
        >
          <h2
            id="unggah-bukti-judul"
            className="font-display text-base font-semibold text-brand-brown-dark"
          >
            Unggah bukti transfer
          </h2>
          <UploadProofForm orderCode={order.orderCode} />
        </section>
      ) : null}

      {canUploadProof ? (
        <CancelOrderButton orderCode={order.orderCode} />
      ) : null}

      {order.proofs.length > 0 ? (
        <section
          aria-labelledby="riwayat-bukti-judul"
          className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
        >
          <h2
            id="riwayat-bukti-judul"
            className="font-display text-base font-semibold text-brand-brown-dark"
          >
            Riwayat bukti transfer
          </h2>
          <ul className="flex flex-col gap-4">
            {order.proofs.map((proof) => {
              const status = PROOF_STATUS_STYLES[proof.status];
              const StatusIcon = status.icon;

              return (
                <li key={proof.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[3/4] w-full max-w-48 overflow-hidden rounded-button border border-warm-border bg-brand-white">
                    <Image
                      src={proof.imageUrl}
                      alt="Bukti transfer yang diunggah"
                      fill
                      sizes="192px"
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-badge border px-3 py-1 text-caption font-medium",
                        status.className,
                      )}
                    >
                      <StatusIcon aria-hidden className="size-4" />
                      {ORDER_PAYMENT_PROOF_STATUS_LABELS[proof.status]}
                    </span>
                    <span className="text-caption text-brand-brown-muted">
                      {formatDateTimeWita(proof.uploadedAt)} WITA
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
      ) : null}
    </section>
  );
}
