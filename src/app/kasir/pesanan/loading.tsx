// Skeleton pemuatan antrean pesanan kasir (design.md §8: setiap pemuatan data
// wajib punya skeleton). Tinggi baris mengikuti daftar agar tata letak stabil.
export default function KasirPesananLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat antrean pesanan"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-72 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-11 w-28 shrink-0 animate-pulse rounded-badge bg-warm-neutral motion-reduce:animate-none"
          />
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((index) => (
          <li
            key={index}
            className="flex h-32 animate-pulse flex-col gap-3 rounded-card border border-warm-border bg-card p-4 motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-40 rounded-button bg-warm-neutral" />
              <div className="h-6 w-32 rounded-badge bg-warm-neutral" />
            </div>
            <div className="h-3 w-56 rounded-button bg-warm-neutral" />
            <div className="h-3 w-44 rounded-button bg-warm-neutral" />
          </li>
        ))}
      </ul>
    </section>
  );
}
