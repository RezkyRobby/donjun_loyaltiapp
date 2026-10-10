export default function CustomerMenuDetailLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat detail menu"
      className="flex flex-col gap-6"
    >
      <div className="h-11 w-24 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="aspect-[4/3] animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
      <div className="flex flex-col gap-2">
        <div className="h-8 w-2/3 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-6 w-32 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="flex gap-2">
          {[0, 1, 2].map((chip) => (
            <div
              key={chip}
              className="h-11 w-24 animate-pulse rounded-badge bg-warm-neutral motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
      <div className="h-40 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
    </section>
  );
}
