import { ChevronRight, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountQrCard } from "@/components/customer/account-qr-card";
import { PointsBalanceCard } from "@/components/customer/points-balance-card";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Beranda" };

// Dashboard pelanggan (PRD §5.1 fitur 4, §8.1 langkah 5): saldo poin berjalan
// dan QR Code akun. Halaman dirender server-side lalu disimpan service worker
// sehingga QR dan saldo terakhir tetap dapat ditampilkan saat koneksi internet
// tidak stabil (NFR §9 PWA & Mode Offline).
export default async function CustomerDashboardPage() {
  const session = await requireCustomer();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, pointsBalance: true },
  });

  if (!user) {
    redirect("/masuk");
  }

  // Pelanggan Google OAuth melengkapi username terlebih dahulu sebelum QR Code
  // akun dapat ditampilkan (PRD §8.1 langkah 5).
  if (!user.username) {
    redirect("/lengkapi-username");
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Beranda
      </h1>
      <PointsBalanceCard pointsBalance={user.pointsBalance} />
      <Link
        href="/pesanan"
        className="flex items-center justify-between gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card transition-colors hover:bg-warm-neutral/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-warm-neutral text-brand-orange-deep"
          >
            <PackageOpen className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-base font-semibold text-brand-brown-dark">
              Pesanan saya
            </span>
            <span className="text-sm text-brand-brown-muted">
              Pantau status pesanan belanja
            </span>
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-brand-brown-muted" />
      </Link>
      <AccountQrCard username={user.username} />
    </section>
  );
}
