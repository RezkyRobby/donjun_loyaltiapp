import {
  ArrowLeft,
  BadgeCheck,
  Mail,
  Phone,
  Ticket,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerAdjustForm } from "@/components/admin/customer-adjust-form";
import { CustomerStatusBadge } from "@/components/admin/customer-status-badge";
import { CustomerSuspendAction } from "@/components/admin/customer-suspend-action";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import {
  POINT_TRANSACTION_METHOD_LABELS,
  POINT_TRANSACTION_TYPE_LABELS,
} from "@/constants/labels";
import { customerIdSchema } from "@/lib/customer-admin";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatPoints } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import {
  getAdminCustomerDetail,
  getAdminCustomerVouchers,
  getCustomerPointHistory,
} from "@/server/admin/customer-list";

export const metadata: Metadata = { title: "Detail Pelanggan" };

// Detail pelanggan (PRD §5.3 fitur 5): profil, saldo, riwayat poin, dan daftar
// voucher milik pelanggan. Koreksi saldo (`ADJUST`) dan penangguhan akun
// tersedia langsung dari halaman ini. Hanya Super Admin yang dapat mengakses
// (proxy + layout admin).
export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const idParsed = customerIdSchema.safeParse(id);

  if (!idParsed.success) notFound();

  const customer = await getAdminCustomerDetail(idParsed.data);

  if (!customer) notFound();

  const customerId = customer.id;
  const query = await searchParams;
  const page = parsePageParam(query.halaman);

  const [history, vouchers] = await Promise.all([
    getCustomerPointHistory(customerId, page),
    getAdminCustomerVouchers(customerId),
  ]);

  function buildHref(target: number): string {
    return target > 1
      ? `/admin/pelanggan/${customerId}?halaman=${target}`
      : `/admin/pelanggan/${customerId}`;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 w-fit">
          <Link href="/admin/pelanggan">
            <ArrowLeft aria-hidden className="size-4" />
            Kembali ke daftar pelanggan
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
              {customer.name}
            </h1>
            <p className="text-sm text-brand-brown-muted">
              {customer.username ? `@${customer.username}` : "Tanpa username"}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <CustomerStatusBadge isActive={customer.isActive} />
            <CustomerSuspendAction
              id={customer.id}
              isActive={customer.isActive}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Profil &amp; Saldo
            </h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail aria-hidden className="mt-0.5 size-4 text-brand-brown-muted" />
                <div className="min-w-0">
                  <dt className="text-xs text-brand-brown-muted">Email</dt>
                  <dd className="break-words text-brand-brown-dark">
                    {customer.email}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone aria-hidden className="mt-0.5 size-4 text-brand-brown-muted" />
                <div className="min-w-0">
                  <dt className="text-xs text-brand-brown-muted">
                    Nomor telepon
                  </dt>
                  <dd className="text-brand-brown-dark">
                    {customer.phone ?? "Belum diisi"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck
                  aria-hidden
                  className="mt-0.5 size-4 text-brand-brown-muted"
                />
                <div>
                  <dt className="text-xs text-brand-brown-muted">
                    Status email
                  </dt>
                  <dd className="text-brand-brown-dark">
                    {customer.emailVerified ? "Terverifikasi" : "Belum terverifikasi"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-brand-brown-muted">Bergabung</dt>
                <dd className="text-brand-brown-dark">
                  {formatDateTimeWita(customer.createdAt)} WITA
                </dd>
              </div>
              <div className="rounded-button bg-warm-neutral px-4 py-3">
                <dt className="text-xs text-brand-brown-muted">Saldo poin</dt>
                <dd className="font-display text-2xl font-bold tabular-nums text-brand-brown-dark">
                  {formatPoints(customer.pointsBalance)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Koreksi Saldo
            </h2>
            <p className="mt-1 text-sm text-brand-brown-muted">
              Penyesuaian manual dengan catatan alasan wajib. Tercatat pada
              riwayat poin dan audit log.
            </p>
            <div className="mt-4">
              {customer.username ? (
                <CustomerAdjustForm
                  username={customer.username}
                  pointsBalance={customer.pointsBalance}
                />
              ) : (
                <p className="text-sm text-brand-brown-muted">
                  Pelanggan belum memiliki username sehingga koreksi saldo tidak
                  tersedia.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-card border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
                Riwayat Poin
              </h2>
              <span className="text-sm text-brand-brown-muted">
                {formatPoints(history.total)} transaksi
              </span>
            </div>

            {history.total === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-brand-brown-muted">
                Belum ada transaksi poin untuk pelanggan ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Waktu (WITA)
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Jenis
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Poin
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.entries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="whitespace-nowrap px-5 py-3 text-brand-brown-muted">
                          {formatDateTimeWita(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-brand-brown-dark">
                          {POINT_TRANSACTION_TYPE_LABELS[entry.type]}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold tabular-nums ${
                            entry.amount >= 0
                              ? "text-donut-matcha-deep"
                              : "text-donut-berry-deep"
                          }`}
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {formatPoints(entry.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-brand-brown-muted">
                            {entry.method
                              ? POINT_TRANSACTION_METHOD_LABELS[entry.method]
                              : "—"}
                            {entry.outletName ? ` · ${entry.outletName}` : ""}
                            {entry.cashierName ? ` · ${entry.cashierName}` : ""}
                          </p>
                          {entry.voucherCode ? (
                            <p className="font-mono text-xs text-brand-brown-dark">
                              {entry.voucherCode}
                            </p>
                          ) : null}
                          {entry.note ? (
                            <p className="mt-0.5 text-xs text-brand-brown-muted">
                              Catatan: {entry.note}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {history.totalPages > 1 ? (
              <div className="border-t border-border px-5 py-4">
                <PaginationNav
                  page={history.page}
                  totalPages={history.totalPages}
                  buildHref={buildHref}
                  label="Navigasi halaman riwayat poin"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-card border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Voucher Pelanggan
            </h2>
            {vouchers.length === 0 ? (
              <p className="mt-3 text-sm text-brand-brown-muted">
                Belum ada voucher yang ditukarkan.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {vouchers.map((voucher) => (
                  <li
                    key={voucher.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Ticket
                        aria-hidden
                        className="size-4 shrink-0 text-brand-brown-muted"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-brand-brown-dark">
                          {voucher.rewardTitle}
                        </p>
                        <p className="font-mono text-xs text-brand-brown-muted">
                          {voucher.voucherCode}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-brand-brown-muted">
                      {voucher.usedAt
                        ? `Terpakai ${formatDateTimeWita(voucher.usedAt)}`
                        : `Ditukar ${formatDateTimeWita(voucher.claimedAt)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
