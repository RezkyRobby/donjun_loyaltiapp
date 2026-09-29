// Header area admin (design.md §2 register *product*): padat dan netral,
// menampilkan identitas backoffice dan pengguna yang sedang masuk.
export function AdminHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:px-8">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-brand-orange font-display text-lg font-bold text-brand-brown-dark"
          >
            D
          </span>
          <span className="font-display text-lg font-bold text-brand-brown-dark">
            Donjun Admin
          </span>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-medium text-brand-brown-dark">
            {name}
          </p>
          <p className="truncate text-xs text-brand-brown-muted">Super Admin</p>
        </div>
      </div>
    </header>
  );
}
