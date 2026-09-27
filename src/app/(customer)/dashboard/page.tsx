// Kerangka halaman Beranda. Saldo poin, QR Code akun, dan tampilan offline
// diimplementasikan pada Task 12.
export default function CustomerDashboardPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Beranda
      </h1>
      <p className="text-sm text-brand-brown-muted">
        Saldo poin dan QR Code akun Anda akan tampil di halaman ini.
      </p>
    </section>
  );
}
