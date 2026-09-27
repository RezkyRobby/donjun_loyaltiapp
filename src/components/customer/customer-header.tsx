// Header ringkas area pelanggan: identitas brand dan sapaan nama pengguna.
export function CustomerHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-warm-border bg-brand-yellow-light/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-brand-orange font-display text-lg font-bold text-brand-brown-dark"
          >
            D
          </span>
          <span className="font-display text-lg font-bold text-brand-brown-dark">
            Donjun Donat
          </span>
        </div>
        <p className="truncate text-sm text-brand-brown-muted">Halo, {name}</p>
      </div>
    </header>
  );
}
