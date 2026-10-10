"use client";

import { useSyncExternalStore } from "react";

import { ORDER_ITEM_QUANTITY_MAX, ORDER_MAX_LINES } from "@/lib/shop";

// Penyimpanan keranjang belanja pelanggan (PRD §5.4 fitur 3). Keranjang bersifat
// lokal pada peramban (localStorage) karena server tidak menyimpan keranjang —
// harga otoritatif tetap dihitung ulang di server saat `createOrder`. Store
// memakai `useSyncExternalStore` agar pembacaan localStorage aman dari
// ketidakcocokan hidrasi: snapshot server selalu keranjang kosong.

export type CartOption = {
  groupId: string;
  tagId: string;
  name: string;
  priceDelta: number;
};

export type CartItem = {
  id: string;
  menuId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  note: string | null;
  options: CartOption[];
};

export type AddCartItemInput = {
  menuId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  note: string | null;
  options: CartOption[];
};

export type AddCartResult =
  | { ok: true }
  | { ok: false; message: string };

const STORAGE_KEY = "donjun.keranjang.v1";
const EMPTY: CartItem[] = [];

export const CART_MAX_LINES = ORDER_MAX_LINES;
export const CART_MAX_QUANTITY = ORDER_ITEM_QUANTITY_MAX;

let items: CartItem[] = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();

// Penjaga bentuk sederhana agar data localStorage yang rusak tidak meruntuhkan
// antarmuka.
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.menuId === "string" &&
    typeof item.name === "string" &&
    (item.imageUrl === null || typeof item.imageUrl === "string") &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number" &&
    (item.note === null || typeof item.note === "string") &&
    Array.isArray(item.options)
  );
}

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    return parsed.filter(isCartItem);
  } catch {
    return EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Kapasitas penuh atau mode privat: keranjang tetap jalan di memori.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function ensureInitialized() {
  if (initialized) return;

  items = readStorage();
  initialized = true;
}

function subscribe(listener: () => void) {
  ensureInitialized();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartItem[] {
  return items;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

// Baris dengan menu, opsi terpilih, dan catatan identik digabung; urutan tag
// diabaikan agar pemilihan opsi yang sama tidak menjadi dua baris.
function buildItemId(
  menuId: string,
  optionTagIds: string[],
  note: string | null,
): string {
  return [menuId, [...optionTagIds].sort().join(","), note ?? ""].join("|");
}

export function addCartItem(input: AddCartItemInput): AddCartResult {
  ensureInitialized();

  const quantity = Math.min(Math.max(input.quantity, 1), CART_MAX_QUANTITY);
  const id = buildItemId(
    input.menuId,
    input.options.map((option) => option.tagId),
    input.note,
  );
  const existing = items.find((item) => item.id === id);

  if (existing) {
    items = items.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: Math.min(item.quantity + quantity, CART_MAX_QUANTITY),
          }
        : item,
    );
  } else {
    if (items.length >= CART_MAX_LINES) {
      return {
        ok: false,
        message: `Keranjang maksimal ${CART_MAX_LINES} jenis menu per pesanan.`,
      };
    }

    items = [...items, { id, ...input, quantity }];
  }

  persist();
  emit();

  return { ok: true };
}

export function updateCartQuantity(id: string, quantity: number) {
  ensureInitialized();

  const clamped = Math.min(Math.max(quantity, 1), CART_MAX_QUANTITY);

  items = items.map((item) =>
    item.id === id ? { ...item, quantity: clamped } : item,
  );
  persist();
  emit();
}

export function removeCartItem(id: string) {
  ensureInitialized();

  items = items.filter((item) => item.id !== id);
  persist();
  emit();
}

export function clearCart() {
  ensureInitialized();

  items = EMPTY;
  persist();
  emit();
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
