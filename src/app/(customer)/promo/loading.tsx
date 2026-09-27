// Skeleton pemuatan katalog promo (design.md §8). Tiga kartu mengikuti tinggi
// kartu reward agar tata letak tidak bergeser saat data tiba.
export default function CustomerPromoLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat promo"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-28 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-10 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <ul className="flex flex-col gap-4">
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="flex animate-pulse flex-col overflow-hidden rounded-card border border-warm-border bg-card shadow-card motion-reduce:animate-none"
          >
            <div className="aspect-[4/3] bg-warm-neutral" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-6 w-3/4 rounded-button bg-warm-neutral" />
              <div className="h-10 rounded-button bg-warm-neutral" />
              <div className="h-12 rounded-button bg-warm-neutral" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
