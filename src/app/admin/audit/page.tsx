import { Download, ScrollText } from "lucide-react";
import type { Metadata } from "next";

import {
  AuditFilterForm,
  type AuditActionGroup,
} from "@/components/admin/audit-filter-form";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_SOURCE_LABELS,
  POINT_TRANSACTION_TYPE_LABELS,
} from "@/constants/labels";
import {
  AUDIT_ADMIN_ACTIONS,
  AUDIT_EXPORT_LIMIT,
  AUDIT_POINT_ACTIONS,
  buildAuditLogQueryString,
  getAuditActionLabel,
  getAuditMethodLabel,
  parseAuditLogFilters,
  toAuditLogFilterInput,
  type AuditLogEntry,
} from "@/lib/audit-log";
import { formatDateTimeWita } from "@/lib/datetime";
import { formatCount, formatPoints } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import {
  getAuditActorOptions,
  getAuditLogEntries,
  getAuditOutletOptions,
} from "@/server/admin/audit-log";

export const metadata: Metadata = { title: "Audit Log" };

// Audit Log Menyeluruh (PRD §5.3 fitur 3): rekam jejak injeksi/penukaran poin
// (PointTransaction) dan aksi administratif (AuditLog) dalam satu daftar, dengan
// filter tanggal/outlet/kasir/tipe aksi, paginasi server-side, dan ekspor CSV.
// Register *product* (design.md §2): tabel padat pada layar lebar, kartu pada
// layar sempit.
function SourceBadge({ source }: { source: AuditLogEntry["source"] }) {
  const isPoint = source === "POINT";

  return (
    <span
      className={`mt-1 inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${
        isPoint
          ? "bg-sky-pastel/70 text-brand-brown-dark"
          : "bg-warm-neutral text-brand-brown-muted"
      }`}
    >
      {AUDIT_SOURCE_LABELS[source]}
    </span>
  );
}

function AmountCell({ amount }: { amount: number | null }) {
  if (amount === null) return <span className="text-brand-brown-muted">—</span>;

  return (
    <span
      className={`font-semibold tabular-nums ${
        amount >= 0 ? "text-donut-matcha-deep" : "text-donut-berry-deep"
      }`}
    >
      {amount > 0 ? "+" : ""}
      {formatPoints(amount)}
    </span>
  );
}

function EntryDetail({ entry }: { entry: AuditLogEntry }) {
  if (entry.source === "ADMIN") {
    return (
      <div className="min-w-0">
        <p className="break-words font-mono text-xs text-brand-brown-muted">
          {entry.entity}
          {entry.entityId ? ` · ${entry.entityId}` : ""}
        </p>
        {entry.metadata !== null && entry.metadata !== undefined ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-brand-brown-muted">
              Detail perubahan
            </summary>
            <pre className="mt-1 max-w-xs overflow-x-auto rounded-button bg-warm-neutral p-2 text-xs text-brand-brown-dark">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-xs text-brand-brown-muted">
        {getAuditMethodLabel(entry.method) || "—"}
        {entry.voucherCode ? ` · ${entry.voucherCode}` : ""}
      </p>
      {entry.note ? (
        <p className="mt-0.5 text-xs text-brand-brown-muted">
          Catatan: {entry.note}
        </p>
      ) : null}
    </div>
  );
}

function PersonCell({
  name,
  username,
}: {
  name: string | null;
  username: string | null;
}) {
  if (!name) return <span className="text-brand-brown-muted">—</span>;

  return (
    <div className="min-w-0">
      <p className="text-brand-brown-dark">{name}</p>
      {username ? (
        <p className="text-xs text-brand-brown-muted">@{username}</p>
      ) : null}
    </div>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseAuditLogFilters(params);
  const page = parsePageParam(params.halaman);

  const [result, outlets, actors] = await Promise.all([
    getAuditLogEntries(filters, page),
    getAuditOutletOptions(),
    getAuditActorOptions(),
  ]);

  const baseQuery = buildAuditLogQueryString(filters);
  const exportHref = `/api/admin/audit/export${
    baseQuery ? `?${baseQuery}` : ""
  }`;

  function buildHref(target: number): string {
    const search = new URLSearchParams(baseQuery);
    if (target > 1) search.set("halaman", String(target));

    const qs = search.toString();

    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  const actionGroups: AuditActionGroup[] = [
    {
      label: "Transaksi Poin",
      options: AUDIT_POINT_ACTIONS.map((value) => ({
        value,
        label: POINT_TRANSACTION_TYPE_LABELS[value],
      })),
    },
    {
      label: "Aksi Administratif",
      options: AUDIT_ADMIN_ACTIONS.map((value) => ({
        value,
        label: AUDIT_ACTION_LABELS[value],
      })),
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Audit Log
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Rekam jejak injeksi poin, penukaran voucher, dan aksi administratif
            untuk mendeteksi kecurangan internal.
          </p>
        </div>
        <Button asChild className="h-11">
          <a href={exportHref} download>
            <Download aria-hidden className="size-4" />
            Ekspor CSV
          </a>
        </Button>
      </div>

      <AuditFilterForm
        key={baseQuery || "default"}
        outlets={outlets}
        actors={actors}
        actionGroups={actionGroups}
        value={toAuditLogFilterInput(filters)}
      />

      {result.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <ScrollText className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Tidak ada entri audit
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Tidak ada aktivitas yang cocok dengan filter ini. Coba longgarkan
            rentang tanggal atau hapus filter lainnya.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-brand-brown-muted">
            {formatCount(result.total)} entri
            {result.total > AUDIT_EXPORT_LIMIT
              ? ` (ekspor CSV memuat ${formatCount(AUDIT_EXPORT_LIMIT)} entri terbaru)`
              : ""}
            .
          </p>

          <div className="hidden overflow-x-auto rounded-card border border-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Waktu (WITA)
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pelaku
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Outlet
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pelanggan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Poin
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {result.entries.map((entry) => (
                  <tr key={`${entry.source}-${entry.id}`} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-brand-brown-muted">
                      {formatDateTimeWita(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-brown-dark">
                        {getAuditActionLabel(entry.actionKey)}
                      </p>
                      <SourceBadge source={entry.source} />
                    </td>
                    <td className="px-4 py-3 text-brand-brown-dark">
                      {entry.actorName ?? "Sistem"}
                    </td>
                    <td className="px-4 py-3 text-brand-brown-dark">
                      {entry.outletName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PersonCell
                        name={entry.customerName}
                        username={entry.customerUsername}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <AmountCell amount={entry.amount} />
                    </td>
                    <td className="px-4 py-3">
                      <EntryDetail entry={entry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {result.entries.map((entry) => (
              <li
                key={`${entry.source}-${entry.id}`}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-brown-dark">
                      {getAuditActionLabel(entry.actionKey)}
                    </p>
                    <SourceBadge source={entry.source} />
                  </div>
                  <span className="shrink-0 text-xs text-brand-brown-muted">
                    {formatDateTimeWita(entry.createdAt)}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-brand-brown-muted">Pelaku</dt>
                    <dd className="text-brand-brown-dark">
                      {entry.actorName ?? "Sistem"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Outlet</dt>
                    <dd className="text-brand-brown-dark">
                      {entry.outletName ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Pelanggan</dt>
                    <dd className="text-brand-brown-dark">
                      {entry.customerName ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Poin</dt>
                    <dd>
                      <AmountCell amount={entry.amount} />
                    </dd>
                  </div>
                </dl>
                <EntryDetail entry={entry} />
              </li>
            ))}
          </ul>

          <PaginationNav
            page={result.page}
            totalPages={result.totalPages}
            buildHref={buildHref}
            label="Navigasi halaman audit log"
          />
        </>
      )}
    </section>
  );
}
