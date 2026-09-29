// Skeleton pemuatan daftar outlet (design.md §8: setiap pemuatan data wajib
// punya skeleton).
export default function AdminOutletLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat daftar outlet"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-80 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <ul className="flex flex-col gap-4">
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="h-20 animate-pulse rounded-card border border-border bg-card motion-reduce:animate-none"
          />
        ))}
      </ul>
    </section>
  );
}
