import { PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OrderCard } from "@/components/customer/order-card";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import { parsePageParam } from "@/lib/pagination";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerOrders } from "@/server/customer/order-list";

export const metadata: Metadata = { title: "Pesanan" };

// Daftar & pelacakan pesanan pelanggan (PRD §5.4 fitur 7). Kedaluwarsa
// ditegakkan secara lazy saat halaman diakses; daftar terpaginasi server-side.
export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCustomer();
  const params = await searchParams;
  const page = parsePageParam(params.halaman);
  const { orders, totalPages, total } = await getCustomerOrders(
    session.user.id,
    page,
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Pesanan
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Pantau status pesanan belanja Anda, dari menunggu pembayaran hingga
          selesai.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-6 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <PackageOpen className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada pesanan
          </h2>
          <p className="text-sm text-brand-brown-muted">
            Pesanan Anda muncul di sini setelah dibuat dari menu belanja.
          </p>
          <Button asChild className="h-12">
            <Link href="/belanja">Buka menu belanja</Link>
          </Button>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Daftar pesanan</h2>
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>

          <PaginationNav
            page={page}
            totalPages={totalPages}
            label="Navigasi halaman pesanan"
            buildHref={(target) =>
              target === 1 ? "/pesanan" : `/pesanan?halaman=${target}`
            }
          />
        </>
      )}
    </section>
  );
}
