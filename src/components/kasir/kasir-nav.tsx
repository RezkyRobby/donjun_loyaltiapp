"use client";

import { History, ScanLine, TicketCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CASHIER_NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

// Navigasi area kasir (PRD Lampiran B). Register *product* (design.md §2):
// tanpa animasi dekoratif, target sentuh besar (≥ 56px), status aktif dibawa
// warna + ikon + atribut aria-current sekaligus (design.md §11).
const NAV_ICONS: Record<string, LucideIcon> = {
  "/kasir/scan": ScanLine,
  "/kasir/validasi": TicketCheck,
  "/kasir/riwayat": History,
};

export function KasirNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi kasir"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-5xl items-stretch justify-between">
        {CASHIER_NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.href];
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-brand-orange-deep"
                    : "text-brand-brown-muted",
                )}
              >
                {Icon ? <Icon aria-hidden className="size-6" /> : null}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
