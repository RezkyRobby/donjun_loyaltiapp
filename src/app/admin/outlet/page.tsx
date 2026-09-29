import { Plus, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OutletActions } from "@/components/admin/outlet-actions";
import { OutletStatusBadge } from "@/components/admin/outlet-status-badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { getAdminOutlets } from "@/server/admin/outlet-list";

export const metadata: Metadata = { title: "Manajemen Outlet" };

// Manajemen outlet (PRD §5.3 fitur 6). Poin dan voucher pelanggan bersifat global
// lintas outlet; data operasional (injeksi & redemption) tercatat per outlet.
// Register *product* (design.md §2): tabel padat pada layar lebar, kartu pada
// layar sempit.
export default async function AdminOutletPage() {
  const outlets = await getAdminOutlets();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Manajemen Outlet
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Kelola data outlet, status aktif, dan penugasan kasir.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/outlet/baru">
            <Plus aria-hidden className="size-4" />
            Tambah outlet
          </Link>
        </Button>
      </div>

      {outlets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Store className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada outlet
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Buat outlet pertama agar kasir dapat ditugaskan dan transaksi tercatat
            per gerai.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/outlet/baru">
              <Plus aria-hidden className="size-4" />
              Tambah outlet
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Outlet
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kontak
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Staf
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {outlets.map((outlet) => (
                  <tr key={outlet.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-brown-dark">
                        {outlet.name}
                      </p>
                      <p className="max-w-md text-xs text-brand-brown-muted">
                        {outlet.address}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-brand-brown-dark">
                      {outlet.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-brand-brown-dark">
                      {formatCount(outlet.staffCount)}
                    </td>
                    <td className="px-4 py-3">
                      <OutletStatusBadge isActive={outlet.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <OutletActions
                        id={outlet.id}
                        isActive={outlet.isActive}
                        canDelete={outlet.canDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {outlets.map((outlet) => (
              <li
                key={outlet.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-brand-brown-dark">
                    {outlet.name}
                  </p>
                  <OutletStatusBadge isActive={outlet.isActive} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="col-span-2">
                    <dt className="text-brand-brown-muted">Alamat</dt>
                    <dd className="text-brand-brown-dark">{outlet.address}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Telepon</dt>
                    <dd className="text-brand-brown-dark">
                      {outlet.phone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Staf</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatCount(outlet.staffCount)}
                    </dd>
                  </div>
                </dl>
                <OutletActions
                  id={outlet.id}
                  isActive={outlet.isActive}
                  canDelete={outlet.canDelete}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
