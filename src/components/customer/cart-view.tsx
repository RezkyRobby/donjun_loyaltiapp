"use client";

import {
  Cookie,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Ticket,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import {
  CART_MAX_QUANTITY,
  clearCart,
  removeCartItem,
  updateCartQuantity,
  useCart,
} from "@/components/customer/cart-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_ACCOUNT_TYPE_LABELS } from "@/constants/labels";
import { formatRupiah } from "@/lib/format";
import { ORDER_NOTE_MAX } from "@/lib/shop";
import {
  calculateShopTotals,
  type ShopPricedItem,
  type VoucherBenefitSnapshot,
} from "@/lib/shop-pricing";
import { cn } from "@/lib/utils";
import { createOrder } from "@/server/customer/orders";
import type {
  ShopCheckoutOptions,
  ShopCheckoutVoucher,
} from "@/server/customer/shop";

// Halaman keranjang & checkout (PRD §5.4 fitur 3–4, §8.7 langkah 3–4). Pelanggan
// meninjau item, menempelkan maksimal satu voucher aktif, memilih outlet
// pengambilan dan rekening tujuan, lalu membuat pesanan. Seluruh harga dan
// potongan dihitung ulang otoritatif di server saat `createOrder` dipanggil.
function describeVoucher(voucher: ShopCheckoutVoucher): string {
  switch (voucher.benefitType) {
    case "PERCENT_DISCOUNT":
      return `Diskon ${voucher.discountPercent ?? 0}%`;
    case "AMOUNT_DISCOUNT":
      return `Diskon ${formatRupiah(voucher.discountAmount ?? 0)}`;
    case "PRODUCT":
      return voucher.linkedMenuName
        ? `Gratis 1 ${voucher.linkedMenuName}`
        : "Gratis 1 menu";
    case "GENERIC":
    default:
      return "Tanpa potongan harga";
  }
}

function toVoucherSnapshot(
  voucher: ShopCheckoutVoucher | undefined,
): VoucherBenefitSnapshot | null {
  if (!voucher) return null;

  return {
    benefitType: voucher.benefitType,
    discountPercent: voucher.discountPercent,
    discountAmount: voucher.discountAmount,
    linkedMenuId: voucher.linkedMenuId,
    linkedMenuName: voucher.linkedMenuName,
    linkedMenuPrice: voucher.linkedMenuPrice,
  };
}

function RadioOption({
  name,
  value,
  checked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked
          ? "border-brand-orange bg-brand-orange/10"
          : "border-warm-border bg-card hover:bg-warm-neutral",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="mt-1 size-5 shrink-0 accent-brand-orange"
      />
      <span className="flex flex-1 flex-col gap-1">{children}</span>
    </label>
  );
}

export function CartView({ options }: { options: ShopCheckoutOptions }) {
  const router = useRouter();
  const cart = useCart();

  const [outletId, setOutletId] = useState(
    options.outlets.length === 1 ? options.outlets[0].id : "",
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    options.paymentAccounts.length === 1
      ? options.paymentAccounts[0].id
      : "",
  );
  const [voucherId, setVoucherId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error";
    text: string;
  } | null>(null);

  const pricedItems: ShopPricedItem[] = cart.map((item) => ({
    menuId: item.menuId,
    menuName: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    note: item.note,
    options: item.options.map((option) => ({
      tagId: option.tagId,
      name: option.name,
      priceDelta: option.priceDelta,
    })),
  }));

  const selectedVoucher = options.vouchers.find(
    (voucher) => voucher.id === voucherId,
  );
  const totals = calculateShopTotals(
    pricedItems,
    toVoucherSnapshot(selectedVoucher),
  );
  const freeLines = totals.lines.filter((line) => line.isFree);
  const selectedAccount = options.paymentAccounts.find(
    (account) => account.id === paymentAccountId,
  );

  if (cart.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Keranjang
        </h1>
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-6 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <ShoppingCart className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Keranjang masih kosong
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Tambahkan menu dari katalog belanja untuk mulai membuat pesanan.
          </p>
          <Button asChild className="h-12">
            <Link href="/belanja">Buka menu belanja</Link>
          </Button>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!outletId) {
      setMessage({ tone: "error", text: "Pilih outlet pengambilan." });
      return;
    }

    if (!paymentAccountId) {
      setMessage({ tone: "error", text: "Pilih rekening tujuan pembayaran." });
      return;
    }

    setIsSubmitting(true);

    const result = await createOrder({
      outletId,
      paymentAccountId,
      voucherId: voucherId || null,
      note: note.trim() ? note.trim() : null,
      items: cart.map((item) => ({
        menuId: item.menuId,
        quantity: item.quantity,
        note: item.note,
        optionTagIds: item.options.map((option) => option.tagId),
      })),
    });

    setIsSubmitting(false);

    if (result.ok) {
      clearCart();
      router.push(`/pesanan/${result.orderCode}`);
      return;
    }

    setMessage({ tone: "error", text: result.message });
  }

  const submitDisabled =
    options.outlets.length === 0 || options.paymentAccounts.length === 0;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Keranjang
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Periksa item, tempel voucher, lalu tentukan outlet dan rekening
          pembayaran.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {cart.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-card border border-warm-border bg-card p-3 shadow-card"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-button bg-warm-neutral">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={`Foto ${item.name}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-full items-center justify-center text-brand-brown-muted"
                >
                  <Cookie className="size-6" />
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-base font-semibold leading-tight text-brand-brown-dark">
                  {item.name}
                </h2>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-brown-dark">
                  {formatRupiah(
                    (item.unitPrice +
                      item.options.reduce(
                        (sum, option) => sum + option.priceDelta,
                        0,
                      )) *
                      item.quantity,
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

              <div className="flex items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label={`Jumlah ${item.name}`}
                  className="flex items-center gap-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateCartQuantity(item.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                    aria-label={`Kurangi jumlah ${item.name}`}
                    className="size-11"
                  >
                    <Minus aria-hidden className="size-4" />
                  </Button>
                  <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-brand-brown-dark">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateCartQuantity(item.id, item.quantity + 1)
                    }
                    disabled={item.quantity >= CART_MAX_QUANTITY}
                    aria-label={`Tambah jumlah ${item.name}`}
                    className="size-11"
                  >
                    <Plus aria-hidden className="size-4" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeCartItem(item.id)}
                  className="h-11 px-3 text-donut-berry-deep hover:bg-donut-berry/10"
                >
                  <Trash2 aria-hidden className="size-4" />
                  Hapus
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2 font-display text-base font-semibold text-brand-brown-dark">
            <Ticket aria-hidden className="size-5" />
            Voucher
          </legend>
          <p className="text-sm text-brand-brown-muted">
            Tempel maksimal satu voucher aktif. Membuat pesanan tidak langsung
            memakai voucher; voucher ditandai terpakai saat kasir mengonfirmasi
            pembayaran.
          </p>
          <div className="flex flex-col gap-2">
            <RadioOption
              name="voucher"
              value=""
              checked={voucherId === ""}
              onSelect={setVoucherId}
            >
              <span className="text-sm font-medium text-brand-brown-dark">
                Tanpa voucher
              </span>
            </RadioOption>
            {options.vouchers.map((voucher) => (
              <RadioOption
                key={voucher.id}
                name="voucher"
                value={voucher.id}
                checked={voucherId === voucher.id}
                onSelect={setVoucherId}
              >
                <span className="text-sm font-medium text-brand-brown-dark">
                  {voucher.rewardTitle}
                </span>
                <span className="text-sm text-brand-brown-muted">
                  {describeVoucher(voucher)}
                </span>
                <span className="font-mono text-caption uppercase tracking-[0.08em] text-brand-brown-muted">
                  {voucher.voucherCode}
                </span>
              </RadioOption>
            ))}
            {options.vouchers.length === 0 ? (
              <p className="rounded-button border border-warm-border bg-warm-neutral/60 px-4 py-3 text-sm text-brand-brown-muted">
                Anda belum memiliki voucher aktif. Tukarkan poin pada menu Promo
                untuk mendapatkannya.
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2 font-display text-base font-semibold text-brand-brown-dark">
            <Store aria-hidden className="size-5" />
            Outlet pengambilan
          </legend>
          {options.outlets.length === 0 ? (
            <FormAlert tone="error">
              Belum ada outlet aktif. Pesanan belum dapat dibuat.
            </FormAlert>
          ) : (
            <div className="flex flex-col gap-2">
              {options.outlets.map((outlet) => (
                <RadioOption
                  key={outlet.id}
                  name="outlet"
                  value={outlet.id}
                  checked={outletId === outlet.id}
                  onSelect={setOutletId}
                >
                  <span className="text-sm font-medium text-brand-brown-dark">
                    {outlet.name}
                  </span>
                  <span className="text-sm text-brand-brown-muted">
                    {outlet.address}
                  </span>
                </RadioOption>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2 font-display text-base font-semibold text-brand-brown-dark">
            <CreditCard aria-hidden className="size-5" />
            Rekening tujuan
          </legend>
          {options.paymentAccounts.length === 0 ? (
            <FormAlert tone="error">
              Belum ada rekening pembayaran aktif. Pesanan belum dapat dibuat.
            </FormAlert>
          ) : (
            <div className="flex flex-col gap-2">
              {options.paymentAccounts.map((account) => (
                <RadioOption
                  key={account.id}
                  name="rekening"
                  value={account.id}
                  checked={paymentAccountId === account.id}
                  onSelect={setPaymentAccountId}
                >
                  <span className="text-sm font-medium text-brand-brown-dark">
                    {account.providerName} ·{" "}
                    {PAYMENT_ACCOUNT_TYPE_LABELS[account.type]}
                  </span>
                  {account.accountNumber ? (
                    <span className="text-sm tabular-nums text-brand-brown-muted">
                      {account.accountNumber}
                      {account.accountHolder
                        ? ` (${account.accountHolder})`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-sm text-brand-brown-muted">
                      Pindai kode QRIS yang ditampilkan kasir
                    </span>
                  )}
                </RadioOption>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="catatan-pesanan">Catatan pesanan</Label>
          <Textarea
            id="catatan-pesanan"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={ORDER_NOTE_MAX}
            placeholder="Contoh: ambil pukul 15.00 WITA"
            className="min-h-20 bg-card"
          />
          <p className="text-caption text-brand-brown-muted">
            Opsional, maksimal {ORDER_NOTE_MAX} karakter ({note.length}/
            {ORDER_NOTE_MAX}).
          </p>
        </div>

        <section
          aria-labelledby="ringkasan-judul"
          className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
        >
          <h2
            id="ringkasan-judul"
            className="font-display text-base font-semibold text-brand-brown-dark"
          >
            Ringkasan pesanan
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-brand-brown-muted">Subtotal</dt>
              <dd className="font-medium tabular-nums text-brand-brown-dark">
                {formatRupiah(totals.subtotal)}
              </dd>
            </div>
            {freeLines.map((line, index) => (
              <div
                key={`${line.menuId}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <dt className="text-donut-matcha-deep">
                  Gratis 1 {line.menuName}
                </dt>
                <dd className="font-medium tabular-nums text-donut-matcha-deep">
                  {formatRupiah(0)}
                </dd>
              </div>
            ))}
            {totals.discountAmount > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-donut-matcha-deep">Potongan voucher</dt>
                <dd className="font-medium tabular-nums text-donut-matcha-deep">
                  -{formatRupiah(totals.discountAmount)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-warm-border pt-2">
              <dt className="font-medium text-brand-brown-dark">Total bayar</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-brand-brown-dark">
                {formatRupiah(totals.total)}
              </dd>
            </div>
          </dl>

          {selectedAccount ? (
            <div className="rounded-button border border-sky-pastel bg-sky-pastel/50 p-3 text-sm text-brand-brown-dark">
              <p className="font-medium">Tujuan transfer</p>
              <p className="tabular-nums">
                {selectedAccount.providerName}
                {selectedAccount.accountNumber
                  ? ` · ${selectedAccount.accountNumber}`
                  : ""}
                {selectedAccount.accountHolder
                  ? ` (${selectedAccount.accountHolder})`
                  : ""}
              </p>
              <p className="text-caption text-brand-brown-muted">
                Transfer sesuai total, lalu unggah bukti pada halaman pesanan.
              </p>
            </div>
          ) : null}

          {message ? (
            <FormAlert tone={message.tone}>{message.text}</FormAlert>
          ) : null}

          <Button
            type="submit"
            disabled={submitDisabled || isSubmitting}
            className="h-12 w-full"
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : null}
            Buat pesanan
          </Button>
        </section>
      </form>
    </section>
  );
}
