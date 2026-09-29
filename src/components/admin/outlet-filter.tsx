"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ChangeEvent } from "react";

import type { OutletOption } from "@/server/admin/analytics";

// Filter outlet dashboard analitik (PRD §5.3 fitur 1). Memilih outlet langsung
// memperbarui query string `?outlet=<id>` tanpa memuat ulang penuh; pilihan
// "Semua outlet" mengosongkan filter. Poin & anggota bersifat global — filter ini
// memengaruhi laporan operasional per outlet (AGENTS.md).
export function OutletFilter({
  outlets,
  value,
}: {
  outlets: OutletOption[];
  value: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const target = next
      ? `${pathname}?outlet=${encodeURIComponent(next)}`
      : pathname;

    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="filter-outlet"
        className="text-xs font-medium text-brand-brown-muted"
      >
        Filter outlet
      </label>
      <select
        id="filter-outlet"
        value={value ?? ""}
        onChange={handleChange}
        disabled={isPending}
        aria-busy={isPending}
        className="h-10 min-w-48 rounded-button border border-input bg-card px-3 text-sm text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">Semua outlet</option>
        {outlets.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </select>
    </div>
  );
}
