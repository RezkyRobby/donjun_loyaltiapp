"use client";

import { ChevronLeft, Cookie, Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import {
  addCartItem,
  CART_MAX_QUANTITY,
  type CartOption,
} from "@/components/customer/cart-store";
import { CartLinkButton } from "@/components/customer/cart-link-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/format";
import { ORDER_NOTE_MAX } from "@/lib/shop";
import { cn } from "@/lib/utils";
import type { ShopCatalogMenu } from "@/server/customer/shop";

// Halaman detail menu (PRD §5.4 fitur 2, §8.7 langkah 2). Seluruh grup opsi
// bersifat opsional dan multi-pilih; tag yang menambah harga menampilkan
// selisihnya. Harga yang ditampilkan dihitung dari data katalog server dan
// tetap dihitung ulang otoritatif saat `createOrder`.
function formatDelta(priceDelta: number): string {
  if (priceDelta === 0) return "";

  const sign = priceDelta > 0 ? "+" : "-";

  return `${sign}${formatRupiah(Math.abs(priceDelta))}`;
}

export function MenuDetailView({ menu }: { menu: ShopCatalogMenu }) {
  const router = useRouter();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{
    tone: "error";
    text: string;
  } | null>(null);

  const selectedOptions: CartOption[] = menu.optionGroups.flatMap((group) =>
    group.tags
      .filter((tag) => selectedTagIds.includes(tag.id))
      .map((tag) => ({
        groupId: group.id,
        tagId: tag.id,
        name: tag.name,
        priceDelta: tag.priceDelta,
      })),
  );

  const optionsDelta = selectedOptions.reduce(
    (sum, option) => sum + option.priceDelta,
    0,
  );
  const unitPrice = menu.price + optionsDelta;
  const lineTotal = unitPrice * quantity;

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  function changeQuantity(next: number) {
    setQuantity(Math.min(Math.max(next, 1), CART_MAX_QUANTITY));
  }

  function handleAdd() {
    const trimmedNote = note.trim();
    const result = addCartItem({
      menuId: menu.id,
      name: menu.name,
      imageUrl: menu.imageUrl,
      unitPrice: menu.price,
      quantity,
      note: trimmedNote.length > 0 ? trimmedNote : null,
      options: selectedOptions,
    });

    if (!result.ok) {
      setMessage({ tone: "error", text: result.message });
      return;
    }

    setMessage(null);
    router.push("/keranjang");
  }

  return (
    <section className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/belanja"
          className="inline-flex h-11 items-center gap-1 rounded-button px-2 text-sm font-medium text-brand-orange-deep transition-colors hover:bg-warm-neutral focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Menu
        </Link>
        <CartLinkButton />
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-warm-border bg-warm-neutral">
        {menu.imageUrl ? (
          <Image
            src={menu.imageUrl}
            alt={`Foto ${menu.name}`}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
            priority
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full items-center justify-center text-brand-brown-muted"
          >
            <Cookie className="size-12" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            {menu.name}
          </h1>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-brand-orange-deep">
            {formatRupiah(menu.price)}
          </span>
        </div>
        {menu.description ? (
          <p className="text-sm text-brand-brown-muted">{menu.description}</p>
        ) : null}
      </div>

      {menu.optionGroups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {menu.optionGroups.map((group) => (
            <fieldset key={group.id} className="flex flex-col gap-3">
              <legend className="font-display text-base font-semibold text-brand-brown-dark">
                {group.name}
              </legend>
              <p className="text-caption text-brand-brown-muted">
                Opsional, boleh pilih lebih dari satu
              </p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const delta = formatDelta(tag.priceDelta);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-badge border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isSelected
                          ? "border-transparent bg-brand-orange text-brand-brown-dark"
                          : "border-warm-border bg-card text-brand-brown-dark hover:bg-warm-neutral",
                      )}
                    >
                      <span>{tag.name}</span>
                      {delta ? (
                        <span
                          className={cn(
                            "text-caption tabular-nums",
                            isSelected
                              ? "text-brand-brown-dark/80"
                              : "text-brand-brown-muted",
                          )}
                        >
                          {delta}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="catatan-item">Catatan</Label>
        <Textarea
          id="catatan-item"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={ORDER_NOTE_MAX}
          placeholder="Contoh: tanpa gula, potong kecil"
          className="min-h-20 bg-card"
        />
        <p className="text-caption text-brand-brown-muted">
          Opsional, maksimal {ORDER_NOTE_MAX} karakter ({note.length}/
          {ORDER_NOTE_MAX}).
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span
            id="jumlah-item-label"
            className="text-sm font-medium text-brand-brown-dark"
          >
            Jumlah
          </span>
          <div
            role="group"
            aria-labelledby="jumlah-item-label"
            className="flex items-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Kurangi jumlah"
              className="size-11"
            >
              <Minus aria-hidden className="size-4" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-8 text-center text-lg font-semibold tabular-nums text-brand-brown-dark"
            >
              {quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= CART_MAX_QUANTITY}
              aria-label="Tambah jumlah"
              className="size-11"
            >
              <Plus aria-hidden className="size-4" />
            </Button>
          </div>
        </div>

        <dl className="flex items-center justify-between gap-3 border-t border-warm-border pt-4">
          <dt className="text-sm text-brand-brown-muted">Total</dt>
          <dd className="font-display text-xl font-bold tabular-nums text-brand-brown-dark">
            {formatRupiah(lineTotal)}
          </dd>
        </dl>

        {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

        <Button type="button" onClick={handleAdd} className="h-12 w-full">
          Tambah ke keranjang
        </Button>
      </div>
    </section>
  );
}
