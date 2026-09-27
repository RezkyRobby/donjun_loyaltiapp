import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VoucherCard } from "@/components/customer/voucher-card";
import { Button } from "@/components/ui/button";
import { parsePageParam } from "@/lib/pagination";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerVouchers } from "@/server/rewards/vouchers";

export const metadata: Metadata = { title: "Voucher" };

// Dompet voucher pelanggan (PRD §5.1 fitur 6). Daftar terpaginasi server-side
// (NFR §9) dengan empty state dan navigasi halaman.
export default async function CustomerVoucherPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCustomer();
  const params = await searchParams;
  const page = parsePageParam(params.halaman);
  const { vouchers, totalPages, total } = await getCustomerVouchers(
    session.user.id,
    page,
  );

  const prevHref =
    page > 1 ? (page === 2 ? "/voucher" : `/voucher?halaman=${page - 1}`) : null;
  const nextHref = page < totalPages ? `/voucher?halaman=${page + 1}` : null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Voucher
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Barcode dan kode voucher Anda. Tunjukkan kepada kasir sebelum
          membayar.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-6 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <Ticket className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada voucher
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Voucher muncul setelah Anda menukarkan poin pada menu Promo.
          </p>
          <Button asChild className="h-12">
            <Link href="/promo">Lihat promo</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {vouchers.map((voucher) => (
              <li key={voucher.id}>
                <VoucherCard voucher={voucher} />
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav
              aria-label="Navigasi halaman voucher"
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
