"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Pencarian pelanggan backoffice (PRD §5.3 fitur 5): nama, username, email,
// atau nomor telepon. Mengirim kata kunci ke query string `?q=` sehingga hasil
// terpaginasi server-side. Filter berlaku eksklusif — pencarian baru me-reset
// halaman ke 1.
export function CustomerSearchForm({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(value);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = term.trim();
    const target = trimmed
      ? `${pathname}?q=${encodeURIComponent(trimmed)}`
      : pathname;

    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cari-pelanggan"
          className="text-xs font-medium text-brand-brown-muted"
        >
          Cari pelanggan
        </label>
        <Input
          id="cari-pelanggan"
          name="q"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Nama, username, email, atau telepon"
          className="h-10 w-full min-w-64 bg-card sm:w-80"
        />
      </div>
      <Button type="submit" className="h-10" disabled={isPending}>
        {isPending ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : (
          <Search aria-hidden className="size-4" />
        )}
        Cari
      </Button>
      {value ? (
        <Button asChild variant="ghost" className="h-10">
          <Link href={pathname}>
            <X aria-hidden className="size-4" />
            Reset
          </Link>
        </Button>
      ) : null}
    </form>
  );
}
