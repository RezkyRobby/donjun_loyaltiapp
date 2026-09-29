// Skeleton pemuatan dashboard analitik (design.md §8: setiap pemuatan data wajib
// punya skeleton). Tinggi kartu mengikuti tata letak akhir agar tidak bergeser.
export default function AdminAnalyticsLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat dashboard analitik"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-5 w-80 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-card border border-border bg-card motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border border-border bg-card motion-reduce:animate-none" />
    </section>
  );
}
