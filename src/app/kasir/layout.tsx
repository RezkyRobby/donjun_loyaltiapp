import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { KasirHeader } from "@/components/kasir/kasir-header";
import { KasirNav } from "@/components/kasir/kasir-nav";
import { ConnectionStatus } from "@/components/shared/connection-status";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isUserRole } from "@/lib/rbac";
import { requireStaff } from "@/server/auth/session";

// Shell area kasir (Task 17). Guard sisi server menjaga seluruh rute /kasir/*
// untuk CASHIER dan SUPER_ADMIN, sekaligus memuat outlet penugasan kasir
// (PRD §8.6 langkah 3). Kerangka ini netral mengikuti register *product*
// (design.md §2) dan menampung halaman scan, validasi, serta riwayat.
export default async function KasirLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStaff();
  const role = isUserRole(session.user.role)
    ? session.user.role
    : UserRole.CASHIER;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { outlet: { select: { name: true } } },
  });

  const outletName = user?.outlet?.name ?? null;
  const needsOutlet = role === UserRole.CASHIER && outletName === null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-brand-orange focus:px-4 focus:py-2 focus:font-medium focus:text-brand-brown-dark"
      >
        Lewati ke konten
      </a>
      <KasirHeader
        cashierName={session.user.name}
        outletName={outletName}
        role={role}
      />
      <main
        id="konten"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4"
      >
        {needsOutlet ? (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-card border border-donut-berry/40 bg-donut-berry/10 px-4 py-3 text-sm text-donut-berry-deep"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin sebelum
              melakukan injeksi poin atau validasi voucher.
            </span>
          </p>
        ) : null}
        {children}
      </main>
      <KasirNav />
      <ConnectionStatus />
    </div>
  );
}
