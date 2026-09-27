"use client";

import { Gift, House, Settings, Ticket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CUSTOMER_NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

// Navigasi bawah area pelanggan (design.md §10: maksimal 4 item, zona jempol,
// target sentuh ≥ 48px). Status aktif dibawa oleh warna, ikon, dan atribut
// aria-current sekaligus.
const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": House,
  "/promo": Gift,
  "/voucher": Ticket,
  "/pengaturan": Settings,
};

export function CustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-warm-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-between">
        {CUSTOMER_NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.href];
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-brand-orange-deep" : "text-brand-brown-muted",
                )}
              >
                {Icon ? <Icon aria-hidden className="size-5" /> : null}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
