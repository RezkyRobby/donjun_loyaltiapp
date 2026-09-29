"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditLogFilterInput } from "@/lib/audit-log";
import type {
  AuditActorOption,
  AuditOutletOption,
} from "@/server/admin/audit-log";

// Form filter audit log (PRD §5.3 fitur 3): tanggal, outlet, kasir/pelaku, dan
// tipe aksi. Nilai dikirim sebagai query string sehingga halaman dan ekspor CSV
// memakai filter yang sama. Filter kosong menghasilkan daftar tanpa batas.

export type AuditActionGroup = {
  label: string;
  options: { value: string; label: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  CASHIER: "Kasir",
  SUPER_ADMIN: "Super Admin",
};

export function AuditFilterForm({
  outlets,
  actors,
  actionGroups,
  value,
}: {
  outlets: AuditOutletOption[];
  actors: AuditActorOption[];
  actionGroups: AuditActionGroup[];
  value: AuditLogFilterInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [outletId, setOutletId] = useState(value.outletId);
  const [actorId, setActorId] = useState(value.actorId);
  const [action, setAction] = useState(value.action);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const search = new URLSearchParams();
    if (from) search.set("dari", from);
    if (to) search.set("sampai", to);
    if (outletId) search.set("outlet", outletId);
    if (actorId) search.set("pelaku", actorId);
    if (action) search.set("aksi", action);

    const qs = search.toString();

    startTransition(() => {
      router.push(qs ? `/admin/audit?${qs}` : "/admin/audit");
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/admin/audit");
    });
  }

  const selectClass =
    "h-10 w-full rounded-button border border-input bg-card px-2 text-sm text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-card p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-dari">Dari tanggal</Label>
          <Input
            id="filter-dari"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10 bg-card"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-sampai">Sampai tanggal</Label>
          <Input
            id="filter-sampai"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-10 bg-card"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-outlet">Outlet</Label>
          <select
            id="filter-outlet"
            value={outletId}
            onChange={(event) => setOutletId(event.target.value)}
            className={selectClass}
          >
            <option value="">Semua outlet</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-pelaku">Kasir / pelaku</Label>
          <select
            id="filter-pelaku"
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            className={selectClass}
          >
            <option value="">Semua pelaku</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name} · {ROLE_LABELS[actor.role] ?? actor.role}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-aksi">Tipe aksi</Label>
          <select
            id="filter-aksi"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className={selectClass}
          >
            <option value="">Semua tipe aksi</option>
            {actionGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-10" disabled={isPending}>
          <Filter aria-hidden className="size-4" />
          Terapkan filter
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={handleReset}
          disabled={isPending}
        >
          <RotateCcw aria-hidden className="size-4" />
          Reset
        </Button>
      </div>

      <p className="text-xs text-brand-brown-muted">
        Filter outlet hanya berlaku untuk transaksi poin; aksi administratif tidak
        terikat outlet tertentu.
      </p>
    </form>
  );
}
