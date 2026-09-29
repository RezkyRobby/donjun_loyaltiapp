import Link from "next/link";

// Konten Syarat dan Ketentuan dipakai bersama oleh halaman statis
// /syarat-ketentuan dan pop-up di area pelanggan (PRD §10, design.md §2).
// `crossLink` dimatikan saat ditampilkan sebagai pop-up agar tautan ke dokumen
// lain tidak memindahkan halaman dan mereset isian formulir yang sedang aktif.
export function TermsContent({ crossLink = true }: { crossLink?: boolean }) {
  return (
    <div className="flex flex-col gap-6 text-sm leading-relaxed text-brand-brown-dark">
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          1. Ketentuan umum
        </h2>
        <p>
          Program loyalitas Donjun Donat dijalankan dalam bentuk aplikasi web.
          Dengan mendaftar dan menggunakan aplikasi, Anda menyetujui ketentuan
          pada halaman ini beserta Kebijakan Privasi yang berlaku.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          2. Keanggotaan
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Satu alamat email hanya untuk satu akun.</li>
          <li>
            Username dan email bersifat permanen dan tidak dapat diubah. Hanya
            nama, nomor telepon, dan kata sandi yang dapat diubah.
          </li>
          <li>
            Akun kasir dibuat oleh admin melalui backoffice, bukan melalui
            pendaftaran mandiri.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          3. Perolehan poin
        </h2>
        <p>
          Setiap satu transaksi pembelian bernilai satu poin. Poin ditambahkan
          oleh kasir setelah identitas akun Anda diverifikasi, baik melalui
          pemindaian QR Code maupun input username. Untuk mencegah
          penyalahgunaan, berlaku jeda minimal 60 detik antar penambahan poin
          pada pelanggan yang sama, kunci anti-duplikasi pada setiap permintaan,
          dan pencatatan audit lengkap. Poin berlaku global di seluruh outlet
          Donjun Donat.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          4. Penukaran poin
        </h2>
        <p>
          Poin dapat ditukarkan dengan promo pada katalog. Penukaran berhasil
          apabila saldo poin mencukupi, kuota promo tersedia, batas klaim per
          pelanggan belum tercapai, dan promo berada dalam periode aktif.
          Penukaran menghasilkan voucher berstatus Aktif.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          5. Voucher
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            Setiap voucher memiliki kode unik dan barcode untuk ditunjukkan
            kepada kasir.
          </li>
          <li>
            Voucher bersifat sekali pakai dan berlaku hingga berhasil divalidasi
            kasir, tanpa batas kedaluwarsa waktu.
          </li>
          <li>
            Voucher yang telah ditukar tidak dapat dibatalkan oleh pelanggan.
            Pembatalan hanya dapat dilakukan admin pada kondisi khusus, dan
            poinnya dikembalikan.
          </li>
          <li>
            Kesalahan validasi oleh kasir dapat dikoreksi admin maksimal 1x24
            jam setelah validasi.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          6. Koreksi saldo
        </h2>
        <p>
          Admin dapat melakukan penyesuaian saldo poin dengan alasan yang wajib
          dicatat. Saldo poin tidak dapat bernilai negatif.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          7. Penyalahgunaan
        </h2>
        <p>
          Akun yang terindikasi penyalahgunaan dapat ditangguhkan. Akun yang
          ditangguhkan tidak dapat masuk, menerima poin baru, atau menukarkan
          poin. Voucher yang telah dimiliki tetap dapat digunakan karena poinnya
          sudah dibelanjakan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          8. Perubahan ketentuan
        </h2>
        <p>
          Donjun Donat dapat memperbarui ketentuan ini dari waktu ke waktu.
          Versi terbaru selalu ditampilkan pada halaman ini.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
          9. Kontak
        </h2>
        <p>
          Untuk pertanyaan mengenai program loyalitas, hubungi admin Donjun
          Donat melalui outlet resmi. Anda juga dapat membaca{" "}
          {crossLink ? (
            <Link
              href="/kebijakan-privasi"
              className="font-medium text-brand-orange-deep underline"
            >
              Kebijakan Privasi
            </Link>
          ) : (
            "Kebijakan Privasi"
          )}{" "}
          kami.
        </p>
      </section>
    </div>
  );
}
