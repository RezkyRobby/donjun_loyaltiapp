// Kerangka halaman Dompet Voucher. Barcode Code 128, kode alfanumerik, dan
// status voucher diimplementasikan pada Task 15.
export default function CustomerVoucherPage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
        Voucher
      </h1>
      <p className="text-sm text-brand-brown-muted">
        Voucher hasil penukaran poin Anda akan tampil di halaman ini.
      </p>
    </section>
  );
}
