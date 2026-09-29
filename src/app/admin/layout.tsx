import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireSuperAdmin } from "@/server/auth/session";

// Shell area admin (Task 26). Guard sisi server menjaga seluruh rute /admin/*
// hanya untuk SUPER_ADMIN (PRD Lampiran B) sebagai lapisan kedua setelah proxy.
// Kerangka mengikuti register *product* (design.md §2): padat, netral, tanpa
// navigasi bawah — backoffice dipakai di layar lebar.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-brand-orange focus:px-4 focus:py-2 focus:font-medium focus:text-brand-brown-dark"
      >
        Lewati ke konten
      </a>
      <AdminHeader name={session.user.name} />
      <AdminNav />
      <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
