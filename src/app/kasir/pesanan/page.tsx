import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-alert";
import { OrderQueueCard } from "@/components/kasir/order-queue-card";
import { OrderStatusFilter } from "@/components/kasir/order-status-filter";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS } from "@/constants/labels";
import { orderStatusFilterSchema, type OrderStatusFilter as OrderStatusFilterValue } from "@/lib/order";
import { formatCount } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/server/auth/session";
import { getCashierOrders } from "@/server/kasir/order-list";

export const metadata: Metadata = { title: "Antrean Pesanan" };

// Antrean pesanan kasir (PRD §5.5 fitur 1, §8.8). Kasir hanya melihat pesanan
// outlet penugasannya, terpaginasi server-side (NFR §9) dengan filter status.
// Kedaluwarsa ditegakkan *lazy* oleh lapisan kueri saat data diakses.
export default async function KasirPesananPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireStaff();
  const params = await searchParams;
  const page = parsePageParam(params.halaman);

  const parsedFilter = orderStatusFilterSchema.safeParse(params.status);
  const statusFilter: OrderStatusFilterValue = parsedFilter.success
    ? parsedFilter.data
    : "ALL";

  const cashier = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { outletId: true },
  });

  if (!cashier?.outletId) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Antrean Pesanan
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Pesanan belanja untuk outlet penugasan Anda.
          </p>
        </div>
        <FormAlert tone="info">
          Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin agar antrean
          pesanan dapat ditampilkan.
        </FormAlert>
      </section>
    );
  }

  const { orders, totalPages, total } = await getCashierOrders(
    cashier.outletId,
    statusFilter,
    page,
  );

  function buildHref(target: number): string {
    const search = new URLSearchParams();
    if (statusFilter !== "ALL") search.set("status", statusFilter);
    if (target > 1) search.set("halaman", String(target));

    const qs = search.toString();

    return qs ? `/kasir/pesanan?${qs}` : "/kasir/pesanan";
  }

  const filterLabel =
    statusFilter === "ALL" ? null : ORDER_STATUS_LABELS[statusFilter];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Antrean Pesanan
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Pesanan belanja outlet penugasan Anda, terbaru lebih dahulu. Total{" "}
          {formatCount(total)} pesanan.
        </p>
      </div>

      <OrderStatusFilter active={statusFilter} />

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <ClipboardList className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            {filterLabel
              ? `Tidak ada pesanan ${filterLabel.toLowerCase()}`
              : "Belum ada pesanan"}
          </h2>
          <p className="text-sm text-brand-brown-muted">
            {filterLabel
              ? "Coba pilih status lain untuk melihat pesanan pada antrean."
              : "Pesanan belanja outlet Anda muncul di sini setelah dibuat pelanggan."}
          </p>
          {filterLabel ? (
            <Button asChild variant="outline" className="h-11">
              <Link href="/kasir/pesanan">Lihat semua status</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <h2 className="sr-only">Daftar pesanan</h2>
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderQueueCard order={order} />
              </li>
            ))}
          </ul>

          <PaginationNav
            page={page}
            totalPages={totalPages}
            label="Navigasi halaman antrean pesanan"
            buildHref={buildHref}
          />
        </>
      )}
    </section>
  );
}
