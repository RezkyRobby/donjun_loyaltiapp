// Skeleton pemuatan dompet voucher (design.md §8). Dua kartu mengikuti tinggi
// kartu voucher agar tata letak tidak bergeser saat data tiba.
export default function CustomerVoucherLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat voucher"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-28 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
        <div className="h-10 animate-pulse rounded-button bg-warm-neutral motion-reduce:animate-none" />
      </div>
      <ul className="flex flex-col gap-4">
        {[0, 1].map((index) => (
          <li
            key={index}
            className="flex animate-pulse flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card motion-reduce:animate-none"
          >
            <div className="h-6 w-2/3 rounded-button bg-warm-neutral" />
            <div className="h-24 rounded-lg bg-warm-neutral" />
            <div className="h-6 w-1/2 self-center rounded-button bg-warm-neutral" />
            <div className="h-12 rounded-button bg-warm-neutral" />
          </li>
        ))}
      </ul>
    </section>
  );
}
