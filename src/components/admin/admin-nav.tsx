"use client";

import {
  ChartColumn,
  Gift,
  ScrollText,
  Store,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

// Navigasi area admin (PRD Lampiran B, design.md §10): nav mendatar yang dapat
// digulir pada layar sempit, berubah menjadi sidebar tetap pada 1024px ke atas.
// Register *product* (design.md §2): netral, tanpa animasi dekoratif. Status
// aktif dibawa warna + ikon + atribut aria-current sekaligus.
const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": ChartColumn,
  "/admin/reward": Gift,
  "/admin/staf": UserCog,
  "/admin/pelanggan": Users,
  "/admin/outlet": Store,
  "/admin/audit": ScrollText,
};

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi admin"
      className="border-b border-border bg-card lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r"
    >
      <ul className="flex w-full items-stretch gap-1 overflow-x-auto px-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.href];
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="lg:w-full">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-11 lg:w-full lg:rounded-button lg:border-b-0",
                  isActive
                    ? "border-brand-orange text-brand-brown-dark lg:bg-brand-yellow"
                    : "border-transparent text-brand-brown-muted hover:text-brand-brown-dark lg:hover:bg-muted",
                )}
              >
                {Icon ? <Icon aria-hidden className="size-4" /> : null}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
