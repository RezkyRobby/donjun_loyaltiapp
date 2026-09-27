// Kerangka halaman Katalog Promo. Daftar reward, kuota, limit, dan periode
// diimplementasikan pada Task 13.
export default function CustomerPromoPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Promo
      </h1>
      <p className="text-sm text-brand-brown-muted">
        Katalog promo yang dapat ditukarkan dengan poin Anda akan tampil di sini.
      </p>
    </section>
  );
}
