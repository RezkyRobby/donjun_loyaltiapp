import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireSuperAdmin } from "@/server/auth/session";

// Shell area admin (Task 26, disesuaikan Task 27). Guard sisi server menjaga
// seluruh rute /admin/* hanya untuk SUPER_ADMIN (PRD Lampiran B) sebagai lapisan
// kedua setelah proxy. Tata letak mengikuti design.md §10: sidebar + area konten
// pada 1024px ke atas, nav mendatar pada layar sempit; lebar konten maksimum
// 1440px.
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
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row">
        <AdminNav />
        <main
          id="konten"
          className="min-w-0 flex-1 px-4 py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
