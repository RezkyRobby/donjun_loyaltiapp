// Skeleton pemuatan audit log (design.md §8: setiap pemuatan data wajib punya
// skeleton).
export default function AdminAuditLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat audit log"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-96 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <div className="h-40 animate-pulse rounded-card border border-border bg-card motion-reduce:animate-none" />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((index) => (
          <li
            key={index}
            className="h-16 animate-pulse rounded-card border border-border bg-card motion-reduce:animate-none"
          />
        ))}
      </ul>
    </section>
  );
}
