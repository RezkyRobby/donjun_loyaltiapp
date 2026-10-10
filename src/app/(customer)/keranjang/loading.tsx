export default function CustomerCartLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat keranjang"
      className="flex flex-col gap-6"
    >
      <div className="h-8 w-40 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="flex flex-col gap-3">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="flex gap-3 rounded-card border border-warm-border bg-card p-3 shadow-card motion-reduce:animate-none"
          >
            <div className="size-16 shrink-0 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/3 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
              <div className="h-3 w-1/3 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
              <div className="h-9 w-32 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
    </section>
  );
}
