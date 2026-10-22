"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { addCartItem } from "@/components/customer/cart-store";
import { Button } from "@/components/ui/button";

// Tombol tambah cepat untuk menu tanpa grup opsi (PRD §5.4 fitur 1). Menu yang
// memiliki opsi wajib dibuka halaman detailnya lebih dulu. Umpan balik sukses
// memakai ikon + teks, bukan warna saja (design.md §11).
export function QuickAddButton({
  menuId,
  name,
  imageUrl,
  price,
}: {
  menuId: string;
  name: string;
  imageUrl: string | null;
  price: number;
}) {
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleAdd() {
    const result = addCartItem({
      menuId,
      name,
      imageUrl,
      unitPrice: price,
      quantity: 1,
      note: null,
      options: [],
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(null);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={added ? "secondary" : "outline"}
        onClick={handleAdd}
        aria-label={`Tambah ${name} ke keranjang`}
        className="h-10 w-full"
      >
        {added ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Plus aria-hidden className="size-4" />
        )}
        <span>{added ? "Ditambahkan" : "Tambah"}</span>
      </Button>
      {message ? (
        <p role="alert" className="text-caption text-donut-berry-deep">
          {message}
        </p>
      ) : null}
    </div>
  );
}
