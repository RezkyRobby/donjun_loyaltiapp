import { formatPoints } from "@/lib/format";

// Kartu saldo poin (PRD §5.1 fitur 4). Saldo bersifat global lintas outlet,
// ditampilkan dengan angka besar bergaya display dan tabular-nums agar stabil
// saat nilainya berubah (design.md §5).
export function PointsBalanceCard({
  pointsBalance,
}: {
  pointsBalance: number;
}) {
  return (
    <section
      aria-labelledby="saldo-poin-judul"
      className="flex flex-col gap-2 rounded-card border border-warm-border bg-card p-6 shadow-card"
    >
      <h2
        id="saldo-poin-judul"
        className="text-sm font-medium text-brand-brown-muted"
      >
        Saldo poin Anda
      </h2>
      <p className="font-display text-[2.5rem] font-bold leading-[1.1] tabular-nums text-brand-brown-dark">
        {formatPoints(pointsBalance)}
      </p>
      <p className="text-sm text-brand-brown-muted">
        Poin berlaku di seluruh outlet Donjun Donat.
      </p>
    </section>
  );
}
