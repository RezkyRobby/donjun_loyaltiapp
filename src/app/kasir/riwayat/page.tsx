import { ChevronLeft, ChevronRight, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { POINT_TRANSACTION_METHOD_LABELS } from "@/constants/labels";
import { formatDateWita, formatTimeWita } from "@/lib/datetime";
import { formatPoints } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { requireStaff } from "@/server/auth/session";
import { getTodayCashierInjections } from "@/server/kasir/injections";

export const metadata: Metadata = { title: "Riwayat Injeksi" };

// Riwayat injeksi kasir (PRD §5.2 fitur 6): injeksi poin milik kasir yang
// sedang login pada hari berjalan menurut WITA. Terpaginasi server-side (NFR §9).
export default async function KasirRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireStaff();
  const params = await searchParams;
  const page = parsePageParam(params.halaman);
  const { injections, totalPages, total } = await getTodayCashierInjections(
    session.user.id,
    page,
  );

  const prevHref =
    page > 1
      ? page === 2
        ? "/kasir/riwayat"
        : `/kasir/riwayat?halaman=${page - 1}`
      : null;
  const nextHref =
    page < totalPages ? `/kasir/riwayat?halaman=${page + 1}` : null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Riwayat Injeksi
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Injeksi poin yang Anda lakukan hari ini, {formatDateWita(new Date())}{" "}
          (WITA). Total {formatPoints(total)} injeksi.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <History className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada injeksi hari ini
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Injeksi poin yang Anda lakukan akan muncul di sini sebagai konfirmasi
            operasional.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {injections.map((injection) => (
              <li
                key={injection.id}
                className="flex items-center justify-between gap-4 rounded-card border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-brown-dark">
                    {injection.customerName}
                    {injection.customerUsername ? (
                      <span className="text-brand-brown-muted">
                        {" "}
                        @{injection.customerUsername}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-brand-brown-muted">
                    {formatTimeWita(injection.createdAt)} WITA
                    {injection.method
                      ? ` · ${POINT_TRANSACTION_METHOD_LABELS[injection.method]}`
                      : ""}
                    {injection.outletName ? ` · ${injection.outletName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-display text-lg font-bold tabular-nums text-donut-matcha-deep">
                  +{formatPoints(injection.amount)}
                </span>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav
              aria-label="Navigasi halaman riwayat injeksi"
              className="flex items-center justify-between gap-3"
            >
              {prevHref ? (
                <Button asChild variant="outline" className="h-11 px-4">
                  <Link href={prevHref}>
                    <ChevronLeft aria-hidden className="size-4" />
                    Sebelumnya
                  </Link>
                </Button>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-sm text-brand-brown-muted">
                Halaman {page} dari {totalPages}
              </span>
              {nextHref ? (
                <Button asChild variant="outline" className="h-11 px-4">
                  <Link href={nextHref}>
                    Berikutnya
                    <ChevronRight aria-hidden className="size-4" />
                  </Link>
                </Button>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
