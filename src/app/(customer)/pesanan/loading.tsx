export default function CustomerOrdersLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat pesanan"
      className="flex flex-col gap-6"
    >
      <div className="h-8 w-32 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="h-4 w-72 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="h-40 animate-pulse rounded-card border border-warm-border bg-card shadow-card motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}
