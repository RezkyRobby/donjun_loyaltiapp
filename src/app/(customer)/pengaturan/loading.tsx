// Skeleton pemuatan pengaturan akun (design.md §8). Mengikuti tinggi kartu
// identitas, data akun, dan kata sandi agar tata letak tidak bergeser.
export default function CustomerSettingsLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat pengaturan"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-32 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-56 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex animate-pulse flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card motion-reduce:animate-none"
        >
          <div className="h-6 w-40 rounded-button bg-warm-neutral" />
          <div className="h-12 rounded-button bg-warm-neutral" />
          <div className="h-12 rounded-button bg-warm-neutral" />
        </div>
      ))}
    </section>
  );
}
