// Skeleton pemuatan dashboard (design.md §8: setiap pemuatan data wajib punya
// skeleton). Mengikuti tinggi kartu saldo dan kartu QR agar tata letak tidak
// bergeser saat data tiba. Animasi dihentikan saat pengguna memilih
// prefers-reduced-motion.
export default function CustomerDashboardLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat beranda"
      className="flex flex-col gap-6"
    >
      <div className="h-8 w-32 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-card border border-warm-border bg-card motion-reduce:animate-none" />
      <div className="flex h-80 animate-pulse flex-col items-center justify-center gap-4 rounded-card border border-warm-border bg-card motion-reduce:animate-none">
        <div className="size-60 rounded-lg bg-warm-neutral" />
        <div className="h-6 w-32 rounded-button bg-warm-neutral" />
      </div>
    </section>
  );
}
