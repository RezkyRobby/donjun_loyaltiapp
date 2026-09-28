// Skeleton pemuatan riwayat injeksi (design.md §8: setiap pemuatan data wajib
// punya skeleton). Tinggi baris mengikuti daftar agar tata letak tidak bergeser.
export default function KasirRiwayatLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat riwayat injeksi"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-72 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((index) => (
          <li
            key={index}
            className="flex h-16 animate-pulse items-center justify-between gap-4 rounded-card border border-border bg-card px-4 motion-reduce:animate-none"
          >
            <div className="flex flex-col gap-2">
              <div className="h-4 w-40 rounded-button bg-warm-neutral" />
              <div className="h-3 w-56 rounded-button bg-warm-neutral" />
            </div>
            <div className="h-5 w-10 rounded-button bg-warm-neutral" />
          </li>
        ))}
      </ul>
    </section>
  );
}
