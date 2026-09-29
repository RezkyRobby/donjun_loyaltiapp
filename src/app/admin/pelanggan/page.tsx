import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CustomerSearchForm } from "@/components/admin/customer-search-form";
import { CustomerStatusBadge } from "@/components/admin/customer-status-badge";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import { customerAdminSearchSchema } from "@/lib/customer-admin";
import { formatDateWita } from "@/lib/datetime";
import { formatCount, formatPoints } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { getAdminCustomerList } from "@/server/admin/customer-list";

export const metadata: Metadata = { title: "Manajemen Pelanggan" };

// Manajemen pelanggan (PRD §5.3 fitur 5). Pencarian mencakup nama, username,
// email, dan nomor telepon; hasil terpaginasi server-side (NFR §9). Data pribadi
// hanya terlihat Super Admin (PRD §10). Register *product* (design.md §2): tabel
// padat pada layar lebar dan kartu pada layar sempit.
export default async function AdminCustomerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const parsedQuery = customerAdminSearchSchema.safeParse(rawQuery ?? "");
  const query = parsedQuery.success ? parsedQuery.data : "";
  const page = parsePageParam(params.halaman);

  const result = await getAdminCustomerList(query, page);

  function buildHref(target: number): string {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (target > 1) search.set("halaman", String(target));

    const qs = search.toString();

    return qs ? `/admin/pelanggan?${qs}` : "/admin/pelanggan";
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Manajemen Pelanggan
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Cari akun, tinjau saldo dan riwayat poin, koreksi saldo, serta
            tangguhkan akun yang terindikasi penyalahgunaan.
          </p>
        </div>
        <CustomerSearchForm value={query} />
      </div>

      {result.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            {query ? <Search className="size-6" /> : <Users className="size-6" />}
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            {query ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            {query
              ? "Tidak ada akun yang cocok dengan kata kunci tersebut. Coba nama, username, email, atau nomor telepon lain."
              : "Akun pelanggan akan muncul di sini setelah pendaftaran melalui aplikasi pelanggan."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-brand-brown-muted">
            {formatCount(result.total)} pelanggan
            {query ? ` untuk "${query}"` : ""}.
          </p>

          <div className="hidden overflow-hidden rounded-card border border-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pelanggan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kontak
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Saldo
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
                {result.customers.map((customer) => (
                  <tr key={customer.id} className="h-14 align-middle">
                    <td className="px-4 py-2">
                      <p className="font-medium text-brand-brown-dark">
                        {customer.name}
                      </p>
                      {customer.username ? (
                        <p className="text-xs text-brand-brown-muted">
                          @{customer.username}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-brand-brown-dark">{customer.email}</p>
                      <p className="text-xs text-brand-brown-muted">
                        {customer.phone ?? "Tanpa nomor telepon"}
                      </p>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatPoints(customer.pointsBalance)}
                    </td>
                    <td className="px-4 py-2">
                      <CustomerStatusBadge isActive={customer.isActive} />
                    </td>
                    <td className="px-4 py-2">
                      <Button asChild variant="outline" size="sm" className="h-9">
                        <Link href={`/admin/pelanggan/${customer.id}`}>
                          Lihat detail
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {result.customers.map((customer) => (
              <li
                key={customer.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-brown-dark">
                      {customer.name}
                    </p>
                    {customer.username ? (
                      <p className="text-xs text-brand-brown-muted">
                        @{customer.username}
                      </p>
                    ) : null}
                  </div>
                  <CustomerStatusBadge isActive={customer.isActive} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="col-span-2">
                    <dt className="text-brand-brown-muted">Kontak</dt>
                    <dd className="break-words text-brand-brown-dark">
                      {customer.email}
                    </dd>
                    <dd className="text-brand-brown-muted">
                      {customer.phone ?? "Tanpa nomor telepon"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Saldo poin</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatPoints(customer.pointsBalance)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Bergabung</dt>
                    <dd className="text-brand-brown-dark">
                      {formatDateWita(customer.createdAt)}
                    </dd>
                  </div>
                </dl>
                <Button asChild variant="outline" className="h-11">
                  <Link href={`/admin/pelanggan/${customer.id}`}>
                    Lihat detail
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <PaginationNav
            page={result.page}
            totalPages={result.totalPages}
            buildHref={buildHref}
            label="Navigasi halaman pelanggan"
          />
        </>
      )}
    </section>
  );
}
