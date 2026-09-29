import { Coins, TicketPercent, Users } from "lucide-react";
import type { Metadata } from "next";

import { LoyalCustomersCard } from "@/components/admin/loyal-customers-card";
import { MetricCard } from "@/components/admin/metric-card";
import { OutletFilter } from "@/components/admin/outlet-filter";
import { parseOutletFilter } from "@/lib/analytics";
import { formatCount, formatPercent, formatPoints } from "@/lib/format";
import {
  getAnalyticsDashboard,
  getOutletOptions,
} from "@/server/admin/analytics";

export const metadata: Metadata = { title: "Dashboard Analitik" };

// Dashboard Analitik Toko (PRD §5.3 fitur 1). Menampilkan total anggota, total
// poin beredar, rasio redemption bulan berjalan, dan pelanggan paling loyal.
// Agregasi periode mengikuti zona WITA. Filter outlet memengaruhi laporan
// operasional (peringkat loyal), sedangkan anggota dan poin bersifat global.
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedOutletId = parseOutletFilter(params.outlet);

  const outlets = await getOutletOptions();
  // Abaikan id outlet yang tidak dikenal agar filter tidak menghasilkan data
  // kosong; kembalikan ke laporan lintas outlet.
  const selectedOutletId =
    requestedOutletId && outlets.some((outlet) => outlet.id === requestedOutletId)
      ? requestedOutletId
      : null;

  const dashboard = await getAnalyticsDashboard(selectedOutletId);
  const selectedOutletName =
    outlets.find((outlet) => outlet.id === selectedOutletId)?.name ?? null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Dashboard Analitik
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Ringkasan retensi program loyalitas. Agregasi bulanan mengikuti zona
            waktu WITA.
          </p>
        </div>
        <OutletFilter outlets={outlets} value={selectedOutletId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={Users}
          label="Total Anggota Terdaftar"
          value={formatCount(dashboard.totalMembers)}
          description="Seluruh akun pelanggan (global lintas outlet)."
        />
        <MetricCard
          icon={Coins}
          label="Total Poin Beredar"
          value={formatPoints(dashboard.circulatingPoints)}
          description="Akumulasi EARN − REDEEM ± ADJUST ± REVERSAL (global lintas outlet)."
        />
        <MetricCard
          icon={TicketPercent}
          label="Rasio Redemption Bulanan"
          value={formatPercent(dashboard.monthlyRedemption.rate)}
          description={`${formatCount(dashboard.monthlyRedemption.used)} terpakai dari ${formatCount(dashboard.monthlyRedemption.issued)} voucher diterbitkan bulan ini.`}
        />
      </div>

      <p className="text-xs text-brand-brown-muted">
        Anggota dan poin bersifat global lintas outlet; filter outlet memengaruhi
        laporan operasional pada daftar pelanggan paling loyal.
      </p>

      <LoyalCustomersCard
        customers={dashboard.loyalCustomers}
        outletName={selectedOutletName}
      />
    </section>
  );
}
