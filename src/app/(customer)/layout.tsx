import type { ReactNode } from "react";

import { CustomerBottomNav } from "@/components/customer/customer-bottom-nav";
import { CustomerHeader } from "@/components/customer/customer-header";
import { ConnectionStatus } from "@/components/shared/connection-status";
import { PwaRegistration } from "@/components/shared/pwa-registration";
import { requireCustomer } from "@/server/auth/session";

// Shell area pelanggan (Task 9). Layout ini menjaga seluruh rute pelanggan
// dengan sesi berperan CUSTOMER di sisi server, menyediakan kerangka navigasi
// mobile-first, dan memasang pondasi PWA (registrasi service worker + indikator
// koneksi). Konten tiap tab diisi pada task berikutnya.
export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireCustomer();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-brand-orange focus:px-4 focus:py-2 focus:font-medium focus:text-brand-brown-dark"
      >
        Lewati ke konten
      </a>
      <CustomerHeader name={session.user.name} />
      <main
        id="konten"
        className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4"
      >
        {children}
      </main>
      <CustomerBottomNav />
      <ConnectionStatus />
      <PwaRegistration />
    </div>
  );
}
