import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

// Halaman statis Kebijakan Privasi (PRD §10). Konten pada v1 dikelola sebagai
// halaman statis dan wajib tersedia di aplikasi pelanggan.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[68ch] flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm font-medium text-brand-orange-deep underline"
        >
          Kembali ke beranda
        </Link>
        <h1 className="font-display text-3xl font-bold text-brand-brown-dark">
          Kebijakan Privasi
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Terakhir diperbarui: 27 September 2026
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-brand-brown-dark">
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            1. Pendahuluan
          </h2>
          <p>
            Kebijakan Privasi ini menjelaskan bagaimana Donjun Donat
            mengumpulkan, menggunakan, dan melindungi data pribadi Anda dalam
            program loyalitas pelanggan. Kebijakan ini disusun mengikuti prinsip
            Undang-Undang Perlindungan Data Pribadi (UU PDP).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            2. Data yang kami kumpulkan
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Nama lengkap dan username unik.</li>
            <li>
              Alamat email, dipakai untuk verifikasi akun dan pemulihan kata
              sandi.
            </li>
            <li>Nomor telepon, bersifat opsional.</li>
            <li>
              Foto profil, hanya bila Anda mendaftar atau masuk dengan Google.
            </li>
            <li>
              Riwayat transaksi poin, voucher, dan aktivitas akun lainnya.
            </li>
          </ul>
          <p>
            Pengumpulan data dibatasi pada kebutuhan operasional program
            loyalitas dan tidak lebih dari itu.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            3. Dasar dan tujuan pemrosesan
          </h2>
          <p>
            Kami memproses data Anda berdasarkan persetujuan yang Anda berikan
            saat mendaftar. Data digunakan untuk mengelola akun, mencatat poin
            transaksi, memproses penukaran voucher, mengirim email transaksional
            seperti verifikasi dan pemulihan kata sandi, serta mencegah
            penyalahgunaan program.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            4. Retensi data
          </h2>
          <p>
            Data akun disimpan selama akun aktif dan hingga 24 bulan sejak
            aktivitas terakhir. Setelah masa tersebut, data dianonimkan. Riwayat
            transaksi poin dapat dipertahankan dalam bentuk anonim untuk
            keperluan audit.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            5. Hak Anda
          </h2>
          <p>
            Anda berhak mengakses data pribadi Anda, mengoreksi nama dan nomor
            telepon melalui halaman Pengaturan, serta meminta penghapusan akun.
            Permintaan penghapusan diproses oleh admin melalui penonaktifan
            akun dan anonimisasi data pribadi.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            6. Keamanan data
          </h2>
          <p>
            Seluruh lalu lintas data dienkripsi melalui HTTPS. Akses internal
            dibatasi berdasarkan peran: kasir hanya melihat nama dan username
            pelanggan, sedangkan data pribadi lain hanya dapat diakses oleh
            admin. Kata sandi disimpan dalam bentuk ter-hash dan cookie sesi
            bersifat httpOnly, secure, serta sameSite.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-brand-brown-dark">
            7. Kontak
          </h2>
          <p>
            Untuk pertanyaan atau permintaan terkait data pribadi, hubungi admin
            Donjun Donat melalui outlet resmi. Anda juga dapat membaca{" "}
            <Link
              href="/syarat-ketentuan"
              className="font-medium text-brand-orange-deep underline"
            >
              Syarat dan Ketentuan
            </Link>{" "}
            program loyalitas.
          </p>
        </section>
      </div>
    </main>
  );
}
