"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";

import type { OutletOption } from "@/server/admin/analytics";
import { moveStaffOutlet } from "@/server/admin/staff";

// Pemilih outlet penugasan pada daftar staf (PRD §5.3 fitur 4: perpindahan
// penugasan outlet). Mengubah pilihan langsung memindahkan staf; penugasan baru
// berlaku untuk transaksi berikutnya (PRD §8.6 edge case).
export function StaffOutletSelect({
  id,
  outlets,
  value,
}: {
  id: string;
  outlets: OutletOption[];
  value: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;

    if (!next || next === value) return;

    setError(null);

    startTransition(async () => {
      const result = await moveStaffOutlet(id, next);

      if (result.ok) {
        router.refresh();
        return;
      }

      setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Outlet penugasan staf"
        value={value ?? ""}
        onChange={handleChange}
        disabled={isPending || outlets.length === 0}
        className="h-9 w-full min-w-40 rounded-button border border-input bg-card px-2 text-sm text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">Belum ditugaskan</option>
        {outlets.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-xs text-donut-berry-deep">
          {error}
        </span>
      ) : null}
    </div>
  );
}
