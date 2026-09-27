import type { Metadata } from "next";
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
      <AccountQrCard username={user.username} />
    </section>
  );
}
