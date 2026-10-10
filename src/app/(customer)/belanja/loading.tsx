export default function CustomerShopLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat menu"
      className="flex flex-col gap-6"
    >
      <div className="h-8 w-28 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="h-4 w-64 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <div className="h-6 w-24 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="flex flex-col overflow-hidden rounded-card border border-warm-border bg-card shadow-card motion-reduce:animate-none"
              >
                <div className="aspect-square animate-pulse bg-warm-neutral motion-reduce:animate-none" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
                  <div className="h-4 w-1/2 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
