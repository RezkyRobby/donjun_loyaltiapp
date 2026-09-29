import { Crown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LoyalCustomer } from "@/server/admin/analytics";
import { formatPoints } from "@/lib/format";

// Daftar pelanggan paling loyal (PRD §5.3 fitur 1): diurutkan dari total poin
// `EARN`. Filter outlet mempersempit peringkat ke poin yang dikumpulkan di outlet
// terpilih. Hanya nama & username yang ditampilkan (PRD §10).
export function LoyalCustomersCard({
  customers,
  outletName,
}: {
  customers: LoyalCustomer[];
  outletName: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown aria-hidden className="size-4 text-brand-orange-deep" />
          Pelanggan Paling Loyal
        </CardTitle>
        <CardDescription>
          {outletName
            ? `Peringkat berdasarkan poin yang dikumpulkan di ${outletName}.`
            : "Peringkat berdasarkan total poin yang dikumpulkan di seluruh outlet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="py-4 text-sm text-brand-brown-muted">
            Belum ada injeksi poin untuk filter ini.
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {customers.map((customer, index) => (
              <li
                key={customer.id}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warm-neutral text-xs font-semibold tabular-nums text-brand-brown-muted"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-brown-dark">
                      {customer.name}
                    </p>
                    {customer.username ? (
                      <p className="truncate text-xs text-brand-brown-muted">
                        @{customer.username}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-brown-dark">
                  {formatPoints(customer.pointsEarned)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
