// Skeleton pemuatan detail pesanan kasir (design.md §8). Tinggi blok mengikuti
// tata letak agar konten tidak meloncat saat selesai dimuat.
export default function KasirPesananDetailLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat detail pesanan"
      className="flex flex-col gap-6"
    >
      <div className="h-11 w-40 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="flex flex-col gap-2">
        <div className="h-6 w-44 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-4 w-52 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <div className="h-20 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
    </section>
  );
}
