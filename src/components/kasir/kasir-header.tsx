import { LogoutButton } from "@/components/auth/logout-button";
import { UserRole } from "@/generated/prisma/enums";

// Header area kasir (design.md §2 register *product*): netral dan tenang,
// menampilkan identitas kasir, outlet penugasannya, dan tombol keluar. Warna
// brand hanya sebagai aksen logo, bukan latar penuh seperti area pelanggan.
export function KasirHeader({
  cashierName,
  outletName,
  role,
}: {
  cashierName: string;
  outletName: string | null;
  role: UserRole;
}) {
  const outletLabel =
    outletName ?? (role === UserRole.SUPER_ADMIN ? "Semua outlet" : "Belum ditugaskan");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-brand-orange font-display text-lg font-bold text-brand-brown-dark"
          >
            D
          </span>
          <span className="font-display text-lg font-bold text-brand-brown-dark">
            Kasir Donjun
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-brand-brown-dark">
              {cashierName}
            </p>
            <p className="truncate text-xs text-brand-brown-muted">
              Outlet: {outletLabel}
            </p>
          </div>
          <LogoutButton variant="compact" />
        </div>
      </div>
    </header>
  );
}
