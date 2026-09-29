import { UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StaffActions } from "@/components/admin/staff-actions";
import { StaffOutletSelect } from "@/components/admin/staff-outlet-select";
import { StaffStatusBadge } from "@/components/admin/staff-status-badge";
import { Button } from "@/components/ui/button";
import { getOutletOptions } from "@/server/admin/analytics";
import { getAdminStaffList } from "@/server/admin/staff-list";

export const metadata: Metadata = { title: "Manajemen Staf" };

// Manajemen akun staf kasir (PRD §5.3 fitur 4). Register *product* (design.md
// §2): tabel padat pada layar lebar dan kartu pada layar sempit.
export default async function AdminStaffPage() {
  const [staff, outlets] = await Promise.all([
    getAdminStaffList(),
    getOutletOptions(),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Manajemen Staf
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Buat akun kasir, kirim undangan aktivasi, pindahkan outlet, dan
            cabut akses bila diperlukan.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/staf/baru">
            <UserPlus aria-hidden className="size-4" />
            Tambah staf
          </Link>
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Users className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada akun staf
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Tambahkan akun kasir; sistem akan mengirim undangan aktivasi ke
            email yang didaftarkan.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/staf/baru">
              <UserPlus aria-hidden className="size-4" />
              Tambah staf
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
                    Nama &amp; email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Outlet
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
                {staff.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-brown-dark">
                        {row.name}
                      </p>
                      <p className="text-xs text-brand-brown-muted">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StaffOutletSelect
                        id={row.id}
                        outlets={outlets}
                        value={row.outletId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StaffStatusBadge
                        isActive={row.isActive}
                        activated={row.activated}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StaffActions
                        id={row.id}
                        isActive={row.isActive}
                        activated={row.activated}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {staff.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-brand-brown-dark">{row.name}</p>
                  <p className="text-xs text-brand-brown-muted">{row.email}</p>
                </div>
                <StaffStatusBadge
                  isActive={row.isActive}
                  activated={row.activated}
                />
                <StaffOutletSelect
                  id={row.id}
                  outlets={outlets}
                  value={row.outletId}
                />
                <StaffActions
                  id={row.id}
                  isActive={row.isActive}
                  activated={row.activated}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
