// Kerangka halaman Pengaturan Akun. Perubahan nama, nomor telepon, dan kata
// sandi diimplementasikan pada Task 16.
export default function CustomerSettingsPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Pengaturan
      </h1>
      <p className="text-sm text-brand-brown-muted">
        Kelola nama, nomor telepon, dan kata sandi akun Anda di halaman ini.
      </p>
    </section>
  );
}
