# Product Requirement Document (PRD)

## Platform Loyalitas Pelanggan (Loyalty Web App) — Donjun Donat

**Versi Dokumen: 2.5** · **Zona Waktu Operasional: Asia/Makassar (WITA, UTC+8)**

### Dokumen Terkait

| Dokumen | Fungsi |
|---|---|
| **`PRD.md`** (dokumen ini) | Sumber kebenaran produk: keputusan bisnis, alur, skema database, dan NFR |
| **`AGENTS.md`** | Panduan kerja agen coding & developer: setup, perintah, aturan kode, guardrails |
| **`design.md`** | Sumber kebenaran desain visual (v1.1 — tersedia) |
| **`.env.example`** | Berkas contoh environment variable (ringkasan pada Lampiran C) |

### Riwayat Revisi

| Versi | Tanggal | Ringkasan Perubahan |
|---|---|---|
| 1.0 | 2026-09-26 | Draf awal: cakupan fitur, tech stack, skema dasar, timeline. |
| 2.0 | 2026-09-26 | Revisi besar: autentikasi email/Google, multi-outlet, idempotency & cooldown, audit log menyeluruh, UU PDP, zona waktu WITA, skema database diperluas, reserved username. |
| 2.1 | 2026-09-26 | Keputusan final produk: username & email permanen, voucher tidak dapat dibatalkan pelanggan, snapshot judul reward, seeder Super Admin, rate limit endpoint publik, kuota email, strategi pengujian + Lighthouse, peta route (Lampiran B). |
| 2.2 | 2026-09-26 | Perbaikan struktural: blok Dokumen Terkait & Riwayat Revisi, edge case eksplisit per alur (§8), Lampiran C (environment variables). |
| 2.3 | 2026-09-26 | design.md v1.0 diterbitkan (sistem desain visual final); status dokumen terkait diperbarui. |
| 2.4 | 2026-10-07 | Penambahan field `domisili` pada data pengguna (User): wajib diisi saat registrasi email + kata sandi, dapat diubah di Pengaturan akun, dan tercatat pada data privasi. |
| 2.5 | 2026-10-07 | Modul **Belanja** (katalog menu, opsi/tag, keranjang, checkout) dengan pembayaran transfer manual (bukti transfer + konfirmasi kasir), integrasi voucher bertipe (generik/produk/persen/nominal), kategori menu terkelola, batas waktu bayar 24 jam (auto-`EXPIRED`), dan entitas pembayaran provider-agnostic siap gateway daring (Midtrans). |
| 2.6 | 2026-10-10 | Status pesanan baru `CANCELED` pada enum `OrderStatus` (§7.6): pembatalan pesanan oleh pelanggan selama `AWAITING_PAYMENT` (§8.7). Voucher yang tertempel tidak dikonsumsi (tetap `ACTIVE`) dan bebas dipakai lagi; aksi dicatat pada `AuditLog` sebagai `ORDER_CANCELED`. |

---

## 1. Executive Summary

Proyek ini bertujuan untuk membangun **Platform Loyalitas Pelanggan Berbasis Web** untuk Donjun Donat. Platform ini dirancang terpisah (*standalone*) dari sistem *Point of Sales* (POS) kasir eksisting guna meminimalisir risiko gangguan operasional transaksi dan mempercepat fase rilis ke pasar. Sistem ini bertujuan meningkatkan frekuensi kunjungan serta retensi pelanggan melalui skema loyalitas sederhana: **1 Transaksi = 1 Poin Loyalitas**. Platform mencakup dua antarmuka utama di atas basis data terintegrasi: *Customer Web App* (untuk pelanggan memantau poin, menampilkan identitas akun, mengklaim *voucher* promo dalam bentuk *barcode*, serta **memesan menu secara daring**) dan *Cashier Web App* (untuk staf kasir memindai QR/input manual *username* guna injeksi poin, memvalidasi *barcode* diskon sekali pakai, dan **mengonfirmasi pesanan belanja**), dilengkapi *Super Admin Backoffice* untuk pengelolaan operasional.

Autentikasi pelanggan menggunakan **email + kata sandi** atau **Google OAuth**, dilengkapi **pemulihan kata sandi mandiri via email**. Skema poin bersifat **global lintas outlet**: satu akun member dapat mengumpulkan dan membelanjakan poin di outlet Donjun Donat mana pun. Modul **Belanja** menyediakan pemesanan menu dengan pembayaran **transfer manual** (pelanggan mengunggah bukti transfer, kasir mengonfirmasi) serta pemakaian voucher pada checkout; pembayaran dirancang provider-agnostic agar gateway daring dapat ditambahkan kemudian. Seluruh operasional, agregasi data, dan pelaporan mengikuti zona waktu **Asia/Makassar (WITA, UTC+8)**.

---

## 2. Latar Belakang

Donjun Donat memiliki basis pelanggan retail yang terus bertumbuh, namun menghadapi sejumlah tantangan dalam mempertahankan retensi konsumen:
- Penggunaan kartu stempel atau kupon fisik konvensional rentan tertinggal, rusak, hilang, serta membebani operasional pencetakan.
- Integrasi modul loyalitas langsung ke sistem mesin POS kasir yang berjalan membutuhkan biaya besar, proses modifikasi rumit, dan berisiko memperlambat antrean kasir apabila terjadi kendala jaringan.
- Pelanggan cenderung resistan terhadap keharusan mengunduh aplikasi *native* (Play Store/App Store) hanya untuk program loyalitas gerai makanan.
- Pemesanan menu secara daring (untuk diambil di outlet) belum tersedia, sehingga pelanggan harus datang langsung atau memesan lewat kanal manual yang sulit dilacak.

Solusi yang tepat adalah menghadirkan aplikasi web responsif (*Progressive Web App*) yang ringan. Pelanggan dapat mendaftar menggunakan email dengan `username` unik, menunjukkan QR Code identitas saat bertransaksi, menukarkan akumulasi poin menjadi *voucher barcode* yang masa aktifnya tetap berlaku seumur hidup hingga berhasil dipindai, serta **memesan menu secara daring dengan pembayaran transfer manual yang dikonfirmasi kasir**.

---

## 3. Tujuan

1. Menyediakan *Customer Web App* yang intuitif dan cepat diakses melalui peramban ponsel pintar tanpa kewajiban mengunduh aplikasi *native*.
2. Memfasilitasi fleksibilitas metode identifikasi akun pelanggan di meja kasir melalui dua saluran: pemindaian layar QR Code pelanggan atau penginputan manual `username` unik.
3. Mendigitalisasi penerbitan dan penukaran *reward* ke dalam format *Barcode* dinamis *single-use* yang aman dan tidak memiliki batas kedaluwarsa waktu.
4. Mencegah manipulasi atau penambahan poin fiktif oleh staf kasir melalui pencatatan audit log transaksi poin yang komprehensif.
5. Menjaga keandalan operasional kasir dengan memisahkan arsitektur sistem loyalitas dari alur sistem pembayaran/POS utama.
6. Menyediakan autentikasi akun yang aman dan mudah bagi pelanggan (email/kata sandi serta Google OAuth) beserta mekanisme pemulihan akun mandiri.
7. Mendukung operasional multi-outlet: satu akun member dengan saldo poin global yang dapat ditukarkan dan digunakan di seluruh outlet Donjun Donat.
8. Menyediakan **modul belanja** untuk pemesanan menu secara daring (dengan kustomisasi opsi/tag) dan **pembayaran transfer manual** yang dikonfirmasi kasir, terintegrasi dengan voucher yang dimiliki pelanggan.

---

## 4. Target Pengguna

| Pengguna | Kebutuhan |
|---|---|
| **Pelanggan (Customer)** | Mendaftar akun dengan email + kata sandi atau Google OAuth serta `username` unik, memantau saldo poin secara *real-time*, menunjukkan QR Code profil, menukarkan poin dengan promo, menyimpan *barcode* voucher, **memesan menu secara daring (keranjang, opsi/tag, tempel voucher, unggah bukti transfer, melacak status pesanan)**, dan mengelola akunnya secara mandiri. |
| **Kasir / Staf Toko** | Akun dibuat dan dikelola oleh Super Admin serta terikat pada satu outlet. Memindai QR Code atau mengetik `username` pelanggan untuk menambah 1 poin per transaksi; memindai *barcode* promo (atau input kode manual) untuk memverifikasi serta menghanguskan voucher diskon; **meninjau antrean pesanan belanja, mengonfirmasi/menolak bukti transfer, dan menandai pesanan selesai.** |
| **Super Admin (Owner)** | Mengelola katalog promo (CRUD reward beserta tipe voucher, kuota, limit klaim, periode, dan S&K), **kategori menu dan menu (beserta grup opsi/tag)**, **rekening pembayaran**, mengelola outlet, mengelola akun staf kasir, mengelola akun pelanggan, memantau ringkasan analitik retensi, serta mengaudit seluruh riwayat injeksi poin, penukaran voucher, dan perubahan status pesanan. |

---

## 5. Fitur & Fungsionalitas

### 5.1 Modul Pelanggan (Customer Web App)

| No | Fitur | Deskripsi |
|---|---|---|
| 1 | **Registrasi & Autentikasi** | Pendaftaran akun mandiri menggunakan **email + kata sandi** atau **Google OAuth** (satu klik). Email wajib diverifikasi melalui tautan yang dikirim ke inbox sebelum akun dapat digunakan. Pelanggan wajib memiliki `username` unik; khusus pendaftaran via Google, pengisian `username` dilakukan setelah otorisasi berhasil. |
| 2 | **Aturan Validasi Username** | Panjang 8–20 karakter; hanya boleh huruf kecil `a-z`, angka `0-9`, titik `.`, dan garis bawah `_`; wajib diawali huruf dan tidak boleh diakhiri titik atau garis bawah. Berlaku *case-insensitive* (disimpan dalam huruf kecil dan dijaga *unique constraint* di database). Daftar *reserved words* yang diblokir (peran, fungsi sistem, brand, dan istilah teknis) diatur lengkap pada **Lampiran A**. Validasi ketersediaan berjalan *real-time* saat pengisian form dan divalidasi ulang di server saat submit. |
| 3 | **Lupa Kata Sandi** | Pemulihan mandiri via email: pengguna meminta tautan reset, sistem mengirim email berisi tautan bertoken sekali pakai dengan masa berlaku terbatas (30 menit). Setelah kata sandi baru disimpan, seluruh sesi aktif pengguna dicabut. |
| 4 | **Dashboard & QR Code Akun** | Tampilan utama yang memuat saldo poin berjalan dan menampilkan komponen **QR Code Statis** akun. QR Code meng-enkapsulasi referensi `username` pelanggan dengan format payload **`DONJUN:v1:<username>`** (berversi agar kompatibel dengan pengembangan mendatang; scanner kasir hanya menerima format ini) untuk dipindai oleh alat pemindai kasir. QR Code dan saldo terakhir tetap dapat ditampilkan saat koneksi internet tidak stabil. |
| 5 | **Katalog Penukaran Promo** | Daftar *reward* yang sedang aktif beserta gambar, biaya poin (misal: "Gratis 1 Donat Glaze" - 5 Poin), **sisa kuota**, **limit klaim per pelanggan**, **masa berlaku promo**, **tipe manfaat** (generik/produk/diskon), dan **Syarat & Ketentuan**. Tombol klaim otomatis dinonaktifkan (*disabled*) apabila poin belum mencukupi, kuota habis, limit per pelanggan tercapai, atau di luar periode aktif. Seluruh promo bersifat global — dapat ditukarkan dan digunakan di outlet mana pun. |
| 6 | **Dompet Voucher (Active Barcodes)** | Daftar *voucher* hasil penukaran poin. Setiap *voucher* menampilkan **Barcode 1D** (Code 128) beserta kode alfanumerik unik di bawahnya (format `DJN-` + 16 karakter, tanpa huruf/angka ambigu). Voucher berstatus aktif permanen hingga digunakan (`status = ACTIVE`) atau tervalidasi kasir. Voucher yang telah ditukar **tidak dapat dibatalkan oleh pelanggan**; pembatalan hanya dapat dilakukan Super Admin pada kondisi khusus (lihat §8.5). Voucher bertipe juga dapat ditempelkan pada pesanan belanja (§5.4). |
| 7 | **Pengaturan Akun** | Perubahan nama, nomor telepon, domisili, dan kata sandi — `username` dan email bersifat **permanen** dan tidak dapat diubah; pengelolaan persetujuan privasi; tautan ke Kebijakan Privasi dan Syarat & Ketentuan program loyalitas. |

### 5.2 Modul Kasir (Cashier Web App)

| No | Fitur | Deskripsi |
|---|---|---|
| 1 | **Pemindaian Identitas (Scan QR)** | Fitur aktivasi kamera perangkat kasir berbasis peramban untuk membaca QR Code akun pelanggan secara instan tanpa perlu mengetik. |
| 2 | **Injeksi Poin Manual (Input Username)** | Kolom teks pencarian `username` sebagai metode alternatif apabila layar ponsel pelanggan redup, retak, atau terkendala teknis saat pemindaian. Pencarian bersifat *case-insensitive* dengan pencocokan awalan (*prefix*) minimal 3 karakter, menampilkan saran hasil secara *real-time*, dan hanya memperlihatkan nama serta username pelanggan. |
| 3 | **Konfirmasi Tambah Poin** | Menampilkan pop-up konfirmasi profil pelanggan (Nama & Username) beserta tombol aksi "Tambah 1 Poin". Dilengkapi proteksi berlapis: pop-up konfirmasi, *debounce*/tombol *disabled* selama proses berjalan, **idempotency key** di sisi server (retry jaringan tidak menggandakan poin), dan **cooldown 60 detik per pelanggan** (nilai dapat dikonfigurasi). Permintaan yang masuk dalam periode cooldown ditolak dengan pesan sisa waktu tunggu. |
| 4 | **Validasi Barcode Promo (Redemption)** | Pemindai khusus untuk membaca *barcode* promo pelanggan. Sistem memverifikasi validitas data: jika sah, sistem mengubah status menjadi terpakai (`status = USED`) secara atomik dan menampilkan notifikasi instruksi diskon kepada kasir. Apabila barcode telah terpakai/dibatalkan, sistem memunculkan indikator peringatan merah. |
| 5 | **Input Kode Manual Voucher** | Metode *fallback* apabila kamera gagal memindai *barcode* voucher: kasir mengetikkan kode alfanumerik yang tertera di bawah barcode (bersifat *case-insensitive*, otomatis dikonversi ke huruf besar). Validasi kode manual menjalankan logika verifikasi yang identik dengan pemindaian. |
| 6 | **Riwayat Injeksi Kasir** | Daftar injeksi poin yang telah dilakukan oleh kasir yang sedang login pada hari berjalan, sebagai konfirmasi visual operasional. |
| 7 | **Antrean Pesanan Belanja** | Daftar pesanan belanja untuk outlet penugasan kasir, dengan filter status. Detail pesanan menampilkan daftar item + opsi/tag, catatan, voucher yang dipakai, dan **bukti transfer**; kasir dapat **mengonfirmasi** (terima), **menolak** (dengan alasan wajib), atau **menandai selesai**. Lihat §8.8. |

### 5.3 Modul Super Admin (Owner / Backoffice)

| No | Fitur | Deskripsi |
|---|---|---|
| 1 | **Dashboard Analitik Toko** | Metrik ringkas meliputi: total anggota terdaftar, total poin beredar (akumulasi `EARN` − `REDEEM` ± `ADJUST`), rasio *redemption* bulanan (voucher terpakai ÷ voucher diterbitkan pada periode yang sama), serta daftar pelanggan paling loyal. Seluruh agregasi mengikuti zona waktu **Asia/Makassar (WITA)**. Filter per outlet tersedia. |
| 2 | **Manajemen Katalog Reward** | Modul CRUD untuk mengatur jenis promo donat/diskon, **tipe manfaat** (`benefitType`: generik, produk tertaut menu, diskon persen, diskon nominal), syarat nilai poin (`pointsCost`), **gambar promo**, **kuota/stok**, **limit klaim per pelanggan**, **periode aktif (tanggal mulai & berakhir)**, **Syarat & Ketentuan**, serta status aktif/nonaktif promo. Reward yang telah memiliki voucher terkait tidak dapat dihapus permanen — penonaktifan digunakan sebagai pengganti; judul **dan manfaat** reward disalin (*snapshot*) ke voucher saat penukaran agar riwayat tetap utuh. |
| 3 | **Audit Log Menyeluruh** | Rekam jejak seluruh aktivitas kritis: (a) injeksi poin — stempel waktu, kasir, outlet, pelanggan penerima, metode input (QR Scan vs Input Username); (b) penukaran voucher — kasir dan outlet yang memvalidasi, waktu validasi; (c) **perubahan status pesanan** — konfirmasi/tolak/selesai/batal dan kedaluwarsa sistem; (d) aksi administratif — perubahan reward/**menu/kategori menu/rekening pembayaran**/staf/outlet, koreksi poin, pembatalan voucher, suspend pelanggan. Dilengkapi filter (tanggal, outlet, kasir, tipe aksi), paginasi, dan ekspor CSV untuk mendeteksi kecurangan internal. |
| 4 | **Manajemen Akun Staf** | Pembuatan akun staf kasir (nama, email, penugasan outlet), pengiriman undangan aktivasi via email, reset kredensial, perpindahan penugasan outlet, dan pencabutan hak akses (penonaktifan akun yang otomatis mencabut seluruh sesi berjalan). Akun `SUPER_ADMIN` **hanya** dibuat melalui *seeder* saat proses deployment; pembuatan akun `SUPER_ADMIN` baru tidak tersedia melalui antarmuka pada v1. |
| 5 | **Manajemen Pelanggan** | Pencarian akun pelanggan (berdasarkan nama, username, email, atau nomor telepon), peninjauan saldo dan riwayat poin, koreksi poin manual (`ADJUST`, wajib disertai catatan alasan), pembatalan/pengembalian voucher yang salah validasi, serta penangguhan (*suspend*) akun yang terindikasi penyalahgunaan. Akun ter-*suspend* tidak dapat login, menerima injeksi poin, atau menukarkan poin baru; voucher yang telah dimiliki tetap dapat digunakan karena poinnya telah dibelanjakan. |
| 6 | **Manajemen Outlet** | CRUD data outlet (nama, alamat, kontak, status aktif). Poin dan voucher pelanggan bersifat global — dapat digunakan di outlet mana pun — sementara data operasional (injeksi & redemption) tercatat per outlet. |
| 7 | **Manajemen Kategori Menu** | CRUD kategori menu belanja (nama, urutan tampil, status aktif/nonaktif). Kategori menghimpun menu pada katalog belanja pelanggan. |
| 8 | **Manajemen Menu** | CRUD menu belanja: kategori, nama, deskripsi, **harga (Rupiah)**, gambar, status aktif/nonaktif, urutan tampil, serta **grup opsi/tag** (mis. "Rasa" berisi tag "Coklat", "Keju"). Tag opsi bersifat opsional, multi-pilih, dan boleh menambah harga (`priceDelta`). Menu yang sudah direferensikan pesanan/voucher tidak dihapus permanen — dinonaktifkan. |
| 9 | **Manajemen Rekening Pembayaran** | CRUD rekening tujuan transfer manual (tipe: transfer bank/e-wallet/QRIS, nama penyedia, nomor rekening, atas nama, gambar QRIS opsional, urutan, status aktif). Rekening bersifat **global** dan ditampilkan kepada pelanggan saat checkout. |
| 10 | **Monitoring Pesanan (opsional)** | Daftar pesanan lintas outlet beserta statusnya untuk pengawasan operasional. |

### 5.4 Modul Belanja (Customer Web App)

| No | Fitur | Deskripsi |
|---|---|---|
| 1 | **Katalog Menu** | Katalog menu aktif yang dikelompokkan per **kategori** (kategori tanpa menu atau menu tanpa kategori ditangani rapi). Diakses melalui **tombol melayang (FAB)** "Belanja" pada shell pelanggan tanpa menambah item navigasi bawah (tetap maksimal 4 item). |
| 2 | **Detail Menu & Opsi** | Halaman detail menampilkan gambar, deskripsi, harga, serta **grup opsi/tag**. Seluruh grup opsi bersifat **opsional dan multi-pilih**; tag yang menambah harga menampilkan selisihnya. Pelanggan juga dapat menambahkan **catatan bebas** per item. |
| 3 | **Keranjang** | Pelanggan dapat menambah beberapa menu (multi-item) beserta opsi dan catatan. Keranjang menampilkan rincian item, opsi, dan subtotal; dapat diubah/dihapus. |
| 4 | **Checkout & Tempel Voucher** | Saat checkout, pelanggan **memilih outlet pengambilan**, **memilih rekening tujuan**, menambahkan catatan pesanan, dan **menempelkan maksimal 1 voucher aktif**. Voucher bertipe: `GENERIC` (tidak mengubah total), `PRODUCT` (otomatis menambah 1 item menu tertaut gratis), `PERCENT_DISCOUNT` (diskon persen), `AMOUNT_DISCOUNT` (diskon nominal). Seluruh harga dan potongan dihitung ulang di server. |
| 5 | **Batas Waktu Pembayaran** | Setelah pesanan dibuat, pelanggan memiliki tenggat **24 jam** (dapat dikonfigurasi via `ORDER_PAYMENT_WINDOW_MINUTES`) untuk mengunggah bukti transfer. Tenggat ditampilkan dalam WITA. Pesanan yang melewati tenggat tanpa bukti berstatus `EXPIRED` (ditegakkan *lazy* saat data diakses); voucher yang tertempel **tidak dikonsumsi**. |
| 6 | **Unggah Bukti Transfer** | Pelanggan mengunggah gambar bukti transfer (JPG/PNG/WebP, maksimal 5 MB). Setelah diunggah, status pesanan menjadi `AWAITING_CONFIRMATION`. Bila pesanan ditolak kasir, pelanggan dapat **mengunggah ulang** bukti selama belum melewati tenggat. |
| 7 | **Pelacakan Status Pesanan** | Daftar dan detail pesanan menampilkan garis waktu fase: `AWAITING_PAYMENT` → `AWAITING_CONFIRMATION` → `IN_PROGRESS` → `COMPLETED`, besertastatus `REJECTED` (dapat diunggah ulang), `EXPIRED`, dan `CANCELED` (dibatalkan pelanggan). Pelanggan dapat **membatalkan** pesanan selama masih `AWAITING_PAYMENT` → status `CANCELED`. |

### 5.5 Modul Pesanan (Cashier Web App)

| No | Fitur | Deskripsi |
|---|---|---|
| 1 | **Antrean Pesanan** | Daftar pesanan untuk outlet penugasan kasir, terpaginasi, dengan filter status. |
| 2 | **Detail Pesanan** | Menampilkan item + opsi/tag, catatan, voucher yang dipakai, total, dan pratinjau **bukti transfer**. |
| 3 | **Konfirmasi Pembayaran** | Kasir mengonfirmasi bukti transfer → status pesanan `IN_PROGRESS`; voucher (bila ada) diubah menjadi `USED` secara **atomik**; `OrderPayment` menjadi `PAID`. |
| 4 | **Penolakan Pembayaran** | Kasir menolak bukti transfer dengan **alasan wajib** → status `REJECTED`; voucher **tidak dikonsumsi**; pelanggan dapat mengunggah ulang. |
| 5 | **Penyelesaian Pesanan** | Kasir menandai pesanan `IN_PROGRESS` → `COMPLETED` saat pesanan siap diambil. |

---

## 6. Tech Stack

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Arsitektur full-stack React terpadu, Server Actions, dan performa tinggi untuk PWA |
| **Front-end Library** | React 19 | Pustaka antarmuka pengguna deklaratif dan reaktif |
| **CSS Framework** | Tailwind CSS 4 | Utilitas styling modular, responsif, dan optimal untuk pendekatan *mobile-first* |
| **UI Components** | shadcn/ui | Komponen antarmuka berbasis Radix Primitives yang aksesibel dan mudah dikustomisasi |
| **Database** | PostgreSQL | Database relasional dengan integritas data ACID dan jaminan *unique constraint* |
| **ORM** | Prisma 7 | Pemetaan skema basis data type-safe dan pengelolaan migrasi terstruktur |
| **Autentikasi** | Better-Auth | Email + kata sandi, Google OAuth (social provider), plugin username, verifikasi email, reset kata sandi, dan sesi berbasis peran (Role: `CUSTOMER`, `CASHIER`, `SUPER_ADMIN`) |
| **Email Transaksional** | Gmail SMTP (via Nodemailer) | Pengiriman email verifikasi akun, tautan reset kata sandi, dan undangan aktivasi staf |
| **Barcode / QR Generation**| `react-barcode` & `qrcode.react` | Render barcode Code 128 sisi klien untuk voucher dan QR code akun |
| **Scanner Engine** | `html5-qrcode` | Modul pemindai kamera terintegrasi pada peramban web kasir tanpa dependensi aplikasi luar |
| **Penanganan Waktu** | `date-fns-tz` (zona `Asia/Makassar`) | Konversi dan agregasi tanggal untuk seluruh laporan operasional dan tenggat pembayaran |
| **Media Penyimpanan** | Cloudinary | Unggah dan penyajian gambar promo reward, **gambar menu**, dan **bukti transfer** pesanan |
| **Observabilitas** | Sentry + Vercel Analytics | Pelacakan error runtime dan pemantauan penggunaan |
| **Deployment & Hosting** | Vercel | Platform hosting serverless dengan CI/CD otomatis |
| **Pembayaran (rencana v2)** | Gateway daring (mis. Midtrans) | Belum aktif pada v1; entitas `OrderPayment` provider-agnostic disiapkan agar dapat ditambahkan tanpa migrasi skema |

---

## 7. Struktur Database (Prisma Schema Blueprint)

### 7.1 Model — Users & Auth
User
├── id (String, CUID)
├── email (String, unique)            — Kredensial login utama & sarana pemulihan akun
├── emailVerified (Boolean)           — Status verifikasi email (otomatis true untuk Google OAuth)
├── role (Enum: CUSTOMER, CASHIER, SUPER_ADMIN)
├── username (String, unique, nullable) — Identitas unik penambahan poin manual; wajib untuk CUSTOMER,
│                                          disimpan dalam huruf kecil, case-insensitive unique
├── name (String)
├── phone (String, unique, nullable)  — Opsional; digunakan untuk pencarian akun oleh admin/support
├── domisili (String, nullable)       — Wajib diisi saat registrasi email + kata sandi (kota tempat tinggal);
│                                        dapat diubah dari Pengaturan akun
├── image (String, nullable)          — Foto profil dari Google OAuth
├── pointsBalance (Int, default 0)    — Akumulasi saldo poin aktif (global lintas outlet)
├── outletId (FK → Outlet, nullable)  — Wajib untuk role CASHIER (penugasan outlet)
├── isActive (Boolean, default true)  — Pencabutan akses tanpa menghapus data
├── createdAt (DateTime)
└── updatedAt (DateTime)

Session, Account, Verification
└── (Tabel standar manajemen autentikasi Better-Auth: Account menyimpan kredensial & Google OAuth,
    Verification menangani token verifikasi email dan reset kata sandi)

### 7.2 Model — Outlet
Outlet
├── id (String, CUID)
├── name (String)                     — Nama outlet (contoh: "Donjun Donat Panakkukang")
├── address (Text)
├── phone (String, nullable)
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

### 7.3 Model — Katalog & Voucher
RewardCatalog
├── id (String, CUID)
├── title (String)                    — Nama promo (contoh: "Gratis 1 Donat Glaze")
├── description (Text, nullable)
├── imageUrl (String, nullable)       — Gambar promo
├── benefitType (Enum: GENERIC, PRODUCT, PERCENT_DISCOUNT, AMOUNT_DISCOUNT, default GENERIC)
│                                       — Tipe manfaat voucher yang diterbitkan
├── linkedMenuId (FK → Menu, nullable) — Menu tertaut (untuk benefitType = PRODUCT)
├── discountPercent (Int, nullable)   — Diskon persen 1–100 (untuk PERCENT_DISCOUNT)
├── discountAmount (Int, nullable)    — Diskon nominal Rupiah (untuk AMOUNT_DISCOUNT)
├── pointsCost (Int)                  — Syarat pemotongan poin (misal: 5)
├── quota (Int, nullable)             — Stok total promo; null = tidak terbatas
├── perUserLimit (Int, nullable)      — Limit klaim per pelanggan; null = tidak terbatas
├── startAt (DateTime, nullable)      — Awal periode aktif promo
├── endAt (DateTime, nullable)        — Akhir periode aktif promo
├── terms (Text, nullable)            — Syarat & Ketentuan penukaran
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Voucher
├── id (String, CUID)
├── voucherCode (String, unique)      — Format "DJN-" + 16 karakter acak dari alfabet non-ambigu
│                                       (tanpa 0/O/1/I/L) untuk Barcode 1D & input manual
├── userId (FK → User)                — Relasi ke pemilik voucher
├── rewardId (FK → RewardCatalog)     — Relasi ke promo yang ditukarkan
├── pointsSpent (Int)                 — Snapshot biaya poin saat penukaran (jejak audit)
├── rewardTitle (String)              — Snapshot judul reward saat penukaran (riwayat tetap utuh
│                                       meski data reward berubah)
├── benefitType (Enum: RewardBenefitType) — Snapshot tipe manfaat saat penukaran
├── discountPercent (Int, nullable)   — Snapshot diskon persen (untuk PERCENT_DISCOUNT)
├── discountAmount (Int, nullable)    — Snapshot diskon nominal (untuk AMOUNT_DISCOUNT)
├── linkedMenuId (FK → Menu, nullable)— Snapshot menu tertaut (untuk PRODUCT)
├── linkedMenuName (String, nullable) — Snapshot nama menu saat penukaran
├── linkedMenuPrice (Int, nullable)   — Snapshot harga menu saat penukaran
├── status (Enum: ACTIVE, USED, CANCELED)
├── claimedAt (DateTime)              — Waktu penukaran poin
├── usedAt (DateTime, nullable)       — Waktu validasi oleh kasir
├── usedByCashierId (FK → User, nullable)  — Kasir yang memvalidasi voucher
├── usedAtOutletId (FK → Outlet, nullable) — Outlet tempat voucher digunakan
├── canceledAt (DateTime, nullable)
└── cancelReason (String, nullable)   — Alasan pembatalan (khusus aksi Super Admin)

### 7.4 Model — Audit Trail & Log Poin
PointTransaction
├── id (String, CUID)
├── customerId (FK → User)            — Pemilik saldo poin
├── cashierId (FK → User, nullable)   — Petugas pelaku (kasir atau super admin)
├── type (Enum: EARN, REDEEM, ADJUST, REVERSAL)
├── amount (Int, bertanda)            — EARN: +1; REDEEM: −pointsCost; REVERSAL: +refund; ADJUST: ±
├── method (Enum: QR_SCAN, USERNAME, BARCODE_SCAN, MANUAL_CODE, ADMIN, SYSTEM, nullable)
├── voucherId (FK → Voucher, nullable)— Referensi voucher untuk transaksi REDEEM/REVERSAL
├── outletId (FK → Outlet, nullable)  — Outlet tempat transaksi terjadi
├── note (String, nullable)           — Wajib diisi untuk transaksi ADJUST (alasan koreksi)
├── idempotencyKey (String, unique, nullable) — Kunci anti-duplikasi injeksi poin
└── createdAt (DateTime)

AuditLog
├── id (String, CUID)
├── actorId (FK → User, nullable)     — Pelaku aksi (null untuk aksi sistem, mis. kedaluwarsa pesanan)
├── action (String)                   — Contoh: STAFF_CREATED, REWARD_UPDATED, MENU_UPDATED,
│                                       ORDER_CONFIRMED, ORDER_REJECTED, ORDER_EXPIRED, POINTS_ADJUSTED
├── entity (String)                   — Jenis entitas terdampak (User, RewardCatalog, Menu, MenuCategory,
│                                       Order, PaymentAccount, Voucher, dst.)
├── entityId (String, nullable)
├── metadata (Json, nullable)         — Detail perubahan (nilai sebelum/sesudah)
└── createdAt (DateTime)

### 7.5 Model — Kategori, Menu & Opsi Belanja
MenuCategory
├── id (String, CUID)
├── name (String)                     — Nama kategori (contoh: "Donat", "Minuman")
├── sortOrder (Int, default 0)        — Urutan tampil pada katalog
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Menu
├── id (String, CUID)
├── categoryId (FK → MenuCategory, nullable) — Kategori menu (opsional)
├── name (String)
├── description (Text, nullable)
├── imageUrl (String, nullable)
├── price (Int)                       — Harga satuan dalam Rupiah
├── isActive (Boolean, default true)
├── sortOrder (Int, default 0)
├── createdAt (DateTime)
└── updatedAt (DateTime)

MenuOptionGroup
├── id (String, CUID)
├── menuId (FK → Menu)                — onDelete: Cascade
├── name (String)                     — Nama grup opsi (contoh: "Rasa")
├── sortOrder (Int, default 0)
├── createdAt (DateTime)
└── updatedAt (DateTime)

MenuOptionTag
├── id (String, CUID)
├── groupId (FK → MenuOptionGroup)    — onDelete: Cascade
├── name (String)                     — Nama tag (contoh: "Coklat", "Keju")
├── priceDelta (Int, default 0)       — Tambahan harga (Rupiah); boleh 0
├── sortOrder (Int, default 0)
├── createdAt (DateTime)
└── updatedAt (DateTime)

### 7.6 Model — Pesanan & Pembayaran
Order
├── id (String, CUID)
├── orderCode (String, unique)        — Format "ORD-" + 10 karakter acak dari alfabet non-ambigu
├── customerId (FK → User)            — Pelanggan pemesan
├── outletId (FK → Outlet)            — Outlet pengambilan
├── status (Enum: AWAITING_PAYMENT, AWAITING_CONFIRMATION, IN_PROGRESS, COMPLETED, REJECTED, EXPIRED, CANCELED)
├── subtotal (Int)                    — Total harga item sebelum potongan (Rupiah)
├── discountAmount (Int, default 0)   — Potongan dari voucher (Rupiah)
├── total (Int)                       — subtotal − discountAmount (≥ 0)
├── paymentDueAt (DateTime)           — Tenggat pembayaran (now + ORDER_PAYMENT_WINDOW_MINUTES)
├── note (String, nullable)           — Catatan pesanan dari pelanggan
├── voucherId (FK → Voucher, nullable, non-unique) — Voucher yang ditempelkan (maks 1)
├── confirmedByCashierId (FK → User, nullable)
├── confirmedAt (DateTime, nullable)
├── rejectionReason (String, nullable)
├── rejectedByCashierId (FK → User, nullable)
├── rejectedAt (DateTime, nullable)
├── completedAt (DateTime, nullable)
├── expiredAt (DateTime, nullable)    — Diisi saat sistem menandai EXPIRED
├── createdAt (DateTime)
└── updatedAt (DateTime)

OrderItem
├── id (String, CUID)
├── orderId (FK → Order)              — onDelete: Cascade
├── menuId (FK → Menu)                — Referensi menu (harga otoritatif dihitung server)
├── menuName (String)                 — Snapshot nama menu
├── unitPrice (Int)                   — Snapshot harga menu saat memesan
├── quantity (Int)                    — Jumlah (mis. 12)
├── isFree (Boolean, default false)   — Baris gratis dari voucher PRODUCT
├── note (String, nullable)           — Catatan bebas per item
├── lineTotal (Int)                   — (unitPrice + Σ priceDelta) × quantity; 0 bila isFree
├── createdAt (DateTime)
└── (relasi: options OrderItemOption[])

OrderItemOption
├── id (String, CUID)
├── orderItemId (FK → OrderItem)      — onDelete: Cascade
├── tagId (FK → MenuOptionTag, nullable, onDelete: SetNull) — Snapshot nama tetap tersimpan
├── name (String)                     — Snapshot nama tag
├── priceDelta (Int, default 0)       — Snapshot tambahan harga tag
└── createdAt (DateTime)

PaymentAccount
├── id (String, CUID)
├── type (Enum: BANK_TRANSFER, EWALLET, QRIS)
├── providerName (String)             — Nama bank/penyedia (contoh: "BCA", "GoPay", "QRIS Donjun")
├── accountNumber (String, nullable)  — Nomor rekening/e-wallet
├── accountHolder (String, nullable)  — Nama pemilik rekening
├── imageUrl (String, nullable)       — Gambar QRIS (bila tipe QRIS)
├── isActive (Boolean, default true)
├── sortOrder (Int, default 0)
├── createdAt (DateTime)
└── updatedAt (DateTime)

OrderPayment
├── id (String, CUID)
├── orderId (FK → Order)              — onDelete: Cascade
├── method (Enum: MANUAL_TRANSFER, PAYMENT_GATEWAY, default MANUAL_TRANSFER)
├── provider (String, nullable)       — Nama provider gateway (mis. "MIDTRANS"); null untuk transfer manual
├── status (Enum: PENDING, PAID, FAILED, EXPIRED, CANCELED, REFUNDED, default PENDING)
├── amount (Int)                      — Nominal yang harus dibayar (Rupiah)
├── paymentAccountId (FK → PaymentAccount, nullable) — Rekening tujuan (transfer manual)
├── providerRef (String, unique, nullable) — ID transaksi provider (idempoten & rujukan)
├── providerPaymentType (String, nullable) — Jenis pembayaran provider (bank_transfer, qris, gopay)
├── vaNumber (String, nullable)       — Nomor Virtual Account (gateway)
├── qrString (String, nullable)       — Payload QR (gateway)
├── expiresAt (DateTime, nullable)    — Kedaluwarsa pembayaran (gateway / tenggat manual)
├── paidAt (DateTime, nullable)
├── rawPayload (Json, nullable)       — Payload mentah webhook untuk audit
├── idempotencyKey (String, unique, nullable) — Anti-duplikasi webhook/aksi
├── createdAt (DateTime)
└── updatedAt (DateTime)

OrderPaymentProof
├── id (String, CUID)
├── orderId (FK → Order)              — onDelete: Cascade
├── imageUrl (String)                 — Bukti transfer (Cloudinary)
├── status (Enum: PENDING, ACCEPTED, REJECTED, default PENDING)
├── uploadedAt (DateTime)
├── reviewedAt (DateTime, nullable)
├── reviewedByCashierId (FK → User, nullable)
└── rejectionReason (String, nullable)

**Enum baru (PRD §7):** `RewardBenefitType`, `OrderStatus`, `PaymentAccountType`, `OrderPaymentProofStatus`, `PaymentMethod`, `PaymentStatus`.

**Indeks penting:** `User.username` (unique), `User.email` (unique), `Voucher.voucherCode` (unique), `PointTransaction (customerId, createdAt)`, `PointTransaction.idempotencyKey` (unique), `AuditLog (createdAt)`, `Menu (isActive, sortOrder)`, `Menu.categoryId`, `Order.orderCode` (unique), `Order (outletId, status, createdAt)`, `Order (customerId, createdAt)`, `Order (status, paymentDueAt)`, `OrderPayment.providerRef` (unique), `OrderPayment.idempotencyKey` (unique), `OrderPayment (orderId, status)`, `OrderPaymentProof (orderId, uploadedAt)`.

---

## 8. User Flow

### 8.1 Alur Registrasi Pelanggan
1. Pelanggan mengakses URL web Donjun Donat melalui ponsel pintar.
2. Pelanggan memilih metode pendaftaran:
   - **Email + Kata Sandi:** mengisi Nama, Email, Kata Sandi, Nomor Telepon (opsional), Domisili, dan `username`; ATAU
   - **Google OAuth:** otorisasi satu klik, sistem menerima nama, email terverifikasi, dan foto profil dari akun Google.
3. Sistem memvalidasi ketersediaan `username` secara *real-time* (aturan karakter, panjang, dan *reserved words* diterapkan) untuk memastikan ketiadaan duplikasi.
4. Sistem mengirim email verifikasi ke inbox pelanggan (khusus jalur email + kata sandi).
5. Pelanggan mengklik tautan verifikasi → akun aktif → dialihkan ke Dashboard Profil yang menampilkan saldo awal (0 poin) dan QR Code akun. Pengguna Google yang belum memiliki `username` diarahkan melengkapi `username` terlebih dahulu.

**Edge case yang ditangani:**
- **Email sudah terdaftar:** sistem mengarahkan pengguna login dengan metode yang sesuai (tidak membuat akun duplikat).
- **Username tidak valid, terpakai, atau mengandung reserved words:** form tidak dapat disubmit; pesan penolakan spesifik ditampilkan (lihat Lampiran A).
- **Nomor telepon sudah dipakai akun lain:** pendaftaran ditolak dan pengguna diarahkan menghubungi admin.
- **Tautan verifikasi kedaluwarsa atau sudah dipakai:** pengguna dapat meminta kirim ulang dari halaman verifikasi (tunduk pada batas 5 email per akun per hari).

### 8.2 Alur Login & Pemulihan Akun
1. Pelanggan login menggunakan email + kata sandi atau tombol **"Masuk dengan Google"**.
2. Apabila kata sandi terlupa, pelanggan menekan "Lupa Kata Sandi" → memasukkan email → sistem mengirim tautan reset (token sekali pakai, berlaku 30 menit).
3. Pelanggan menyimpan kata sandi baru; seluruh sesi aktif pada perangkat lain otomatis dicabut.
4. Kasir dan Super Admin login melalui halaman login khusus staf (tanpa opsi registrasi mandiri).

**Edge case yang ditangani:**
- **5 percobaan gagal dalam 15 menit:** akun + IP terkunci sementara (*lockout*) sesuai kebijakan rate limit.
- **Permintaan reset untuk email tak terdaftar:** sistem tetap menampilkan pesan sukses generik untuk mencegah enumerasi email.
- **Token reset kedaluwarsa atau sudah dipakai:** pengguna diminta meminta tautan baru.
- **Akun ter-suspend atau staf nonaktif:** login ditolak dengan pesan yang mengarahkan menghubungi admin.

### 8.3 Alur Penambahan Poin (Earning Points)
1. Pelanggan melakukan pembayaran pembelian donat pada kasir (dicatat pada sistem POS terpisah).
2. Kasir menanyakan kepemilikan akun member Donjun Donat.
3. Pelanggan menunjukkan layar ponsel (QR Code) ATAU menyebutkan `username` unik akunnya.
4. Kasir membuka **Cashier Web App**:
   - Menekan tombol "Scan QR" untuk membaca kode via kamera; ATAU
   - Mengetikkan `username` pelanggan pada kolom pencarian.
5. Layar kasir menampilkan **pop-up konfirmasi** profil: "Pelanggan ditemukan: [Nama] (@[username])".
6. Kasir menekan tombol "Tambah 1 Poin". Server memvalidasi secara berlapis:
   - **Idempotency key** dari klien — permintaan ulang/retry jaringan tidak menggandakan poin;
   - **Cooldown** — bila pelanggan yang sama menerima injeksi dalam < 60 detik terakhir, permintaan ditolak dengan pesan sisa waktu tunggu;
   - **Otorisasi & validasi input** — sesi kasir valid dan akun pelanggan berstatus aktif.
7. Sistem menjalankan *atomic transaction*: saldo `pointsBalance` pelanggan bertambah 1, dan baris baru bertipe `EARN` tercatat pada tabel `PointTransaction` (memuat `cashierId`, `outletId`, dan `method`).
8. Saldo poin pada antarmuka pelanggan langsung terbarui.

**Edge case yang ditangani:**
- **QR berformat tidak dikenal:** scanner menolak dengan pesan bahwa QR bukan milik platform Donjun (hanya payload `DONJUN:v1:` yang diterima).
- **Username tidak ditemukan:** kasir menerima pesan jelas; sistem tidak membuat akun otomatis.
- **Cooldown masih berjalan:** injeksi ditolak dengan sisa waktu tunggu; tombol aktif kembali setelah hitung mundur selesai.
- **Klik ganda atau retry jaringan:** *debounce* + tombol *disabled* di klien, idempotency key di server — poin hanya bertambah sekali.
- **Akun pelanggan ter-suspend:** injeksi poin ditolak.

### 8.4 Alur Penukaran & Penggunaan Promo (Redemption)
1. Pelanggan mengakses tab "Katalog Promo" pada Customer Web App.
2. Pelanggan memilih promo yang memenuhi syarat (saldo cukup, kuota tersedia, limit per pelanggan belum tercapai, dalam periode aktif), lalu menekan "Tukar Poin".
3. Sistem menjalankan *atomic transaction*: memotong saldo poin sebesar `pointsCost` (dengan pengecekan saldo kondisional agar tidak pernah negatif), mengurangi kuota promo secara atomik, menghasilkan *record* `Voucher` baru berstatus `ACTIVE` (dengan **snapshot** judul dan manfaat reward), dan mencatat `PointTransaction` bertipe `REDEEM` yang mereferensikan voucher tersebut.
4. Barcode promo dan kode alfanumerik tampil pada menu "Voucher Saya".
5. Saat berkunjung kembali ke toko (tanpa batas waktu kadaluwarsa): Pelanggan menunjukkan Barcode tersebut kepada kasir sebelum transaksi POS diselesaikan.
6. Kasir memilih menu "Validasi Voucher" pada Cashier Web App, lalu memindai *barcode* dari layar pelanggan — ATAU mengetikkan kode alfanumerik secara manual apabila pemindaian gagal.
7. Sistem mengeksekusi pembaruan status secara **atomik dan kondisional** (`UPDATE ... WHERE status = 'ACTIVE'`) sehingga dua pemindaian simultan tidak mungkin berhasil dua kali:
   - Jika `status == ACTIVE`: status berubah menjadi `USED`, `usedAt`, `usedByCashierId`, dan `usedAtOutletId` tercatat, dan kasir menerima konfirmasi hijau untuk memotong harga di POS.
   - Jika `status == USED`: sistem menolak dengan peringatan visual merah bahwa voucher telah terpakai sebelumnya (disertai waktu penggunaan).
   - Jika `status == CANCELED`: sistem menolak dengan peringatan bahwa voucher telah dibatalkan.

**Edge case yang ditangani:**
- **Saldo tidak cukup akibat permintaan bersamaan:** transaksi gagal utuh (atomic) — tidak ada poin terpotong sebagian maupun saldo negatif.
- **Kuota promo habis saat permintaan bersamaan:** hanya satu permintaan berhasil; sisanya menerima pesan kuota habis.
- **Limit klaim per pelanggan tercapai atau di luar periode aktif:** tombol dinonaktifkan di klien dan server menolak dengan alasan yang sama.
- **Reward dinonaktifkan setelah voucher terbit:** voucher yang telah berstatus `ACTIVE` tetap sah dan dapat digunakan.
- **Voucher telah terpakai:** percobaan kedua menerima status `USED` beserta waktu penggunaannya (tanpa kemungkinan klaim ganda).

### 8.5 Alur Pembatalan & Koreksi (Void / Refund)
1. **Kebijakan umum:** voucher yang telah ditukar **tidak dapat dibatalkan oleh pelanggan** — poin yang telah dibelanjakan tidak dikembalikan secara otomatis.
2. **Pembatalan oleh Super Admin:** untuk kondisi khusus (mis. kesalahan sistem atau kebijakan owner), Super Admin dapat membatalkan voucher berstatus `ACTIVE` dengan alasan wajib; poin dikembalikan sebagai transaksi `REVERSAL` dan aksi tercatat pada `AuditLog`.
3. **Koreksi kesalahan validasi:** apabila kasir salah memvalidasi voucher (misal voucher ter-scan tanpa transaksi riil), Super Admin dapat mengembalikan status voucher dari `USED` ke `ACTIVE` maksimal 1x24 jam setelah validasi, dengan alasan wajib yang tercatat pada `AuditLog`.
4. **Koreksi saldo oleh Super Admin:** Super Admin dapat melakukan penyesuaian saldo poin manual (`ADJUST`, nilai positif/negatif) dengan catatan alasan wajib; seluruh koreksi terekam pada `PointTransaction` dan `AuditLog`.

**Edge case yang ditangani:**
- **Permintaan pembatalan oleh pelanggan:** ditolak secara desain — poin tidak dikembalikan otomatis (kebijakan umum).
- **Koreksi voucher `USED` di luar 1x24 jam:** tidak tersedia; jalur koreksi berikutnya adalah penyesuaian saldo `ADJUST` dengan alasan.
- **Voucher berstatus `CANCELED`:** tidak dapat diaktifkan kembali; pengembalian poin lanjutan hanya melalui `ADJUST`.
- **Koreksi `ADJUST` negatif melebihi saldo berjalan:** ditolak — saldo tidak boleh negatif.
- **Voucher yang ditempelkan pada pesanan belanja:** tidak dikonsumsi sampai kasir mengonfirmasi pembayaran; bila pesanan ditolak/kedaluwarsa, voucher tetap `ACTIVE`.

### 8.6 Alur Manajemen Staf (Onboarding Kasir)
1. Super Admin membuka menu "Manajemen Akun Staf" dan mengisi data kasir baru: Nama, Email, dan Outlet penugasan.
2. Sistem mengirim email undangan aktivasi; kasir menetapkan kata sandinya sendiri melalui tautan bertoken.
3. Kasir login melalui halaman login staf dan hanya dapat mengakses fitur Cashier Web App pada outlet penugasannya.
4. Saat kasir dinonaktifkan (`isActive = false`), seluruh sesinya langsung dicabut dan akses ke aplikasi ditolak.

**Edge case yang ditangani:**
- **Email kandidat staf sudah terdaftar pada akun lain:** pembuatan akun ditolak — satu email untuk satu akun.
- **Undangan aktivasi kedaluwarsa:** Super Admin dapat mengirim ulang undangan (tunduk pada batas 5 email per akun per hari).
- **Staf dinonaktifkan saat sedang login:** sesi dicabut seketika; permintaan berikutnya ditolak.
- **Kasir dipindah outlet:** penugasan baru berlaku untuk transaksi berikutnya; riwayat transaksi lama tetap tercatat pada outlet asal.

### 8.7 Alur Belanja & Pembayaran Manual (Pelanggan)
1. Pelanggan membuka modul **Belanja** melalui tombol melayang (FAB) pada shell pelanggan, lalu menelusuri menu yang dikelompokkan per kategori.
2. Pelanggan membuka detail menu, memilih grup opsi/tag (semua opsional, multi-pilih) dan menambahkan catatan bebas, lalu menambahkan item ke keranjang. Pelanggan dapat menambahkan beberapa menu (multi-item).
3. Pada halaman keranjang, pelanggan:
   - menempelkan **maksimal 1 voucher aktif** (opsional) — tipe `PRODUCT` menambahkan 1 item menu tertaut gratis, `PERCENT_DISCOUNT`/`AMOUNT_DISCOUNT` memotong total, `GENERIC` tidak mengubah total;
   - **memilih outlet pengambilan** dan **rekening tujuan**;
   - menambahkan catatan pesanan (opsional).
4. Pelanggan menekan "Buat pesanan". Sistem menghitung ulang seluruh harga dan potongan di server (otoritatif), lalu dalam satu transaksi:
   - mengunci voucher (baris `Voucher` dikunci; ditolak bila voucher sudah dipakai pesanan aktif lain);
   - membuat `Order` (status `AWAITING_PAYMENT`), baris `OrderItem`/`OrderItemOption`, dan `OrderPayment` (manual, `PENDING`) dengan `paymentDueAt = now + ORDER_PAYMENT_WINDOW_MINUTES`;
   - **voucher tetap `ACTIVE`** (belum dikonsumsi).
5. Pelanggan melakukan transfer ke rekening tujuan lalu **mengunggah bukti transfer**; status pesanan menjadi `AWAITING_CONFIRMATION`.
6. Kasir meninjau dan memutuskan (lihat §8.8). Pelanggan memantau status pada halaman Pesanan.

**Edge case yang ditangani:**
- **Voucher sudah dipakai pesanan aktif lain:** penempelan ditolak; sistem menyarankan memilih voucher lain.
- **Melewati tenggat tanpa bukti:** pesanan ditandai `EXPIRED` saat data diakses; voucher yang tertempel **tidak dikonsumsi** dan dapat dipakai lagi.
- **Harga/opsi tidak valid atau diubah setelah keranjang:** server menghitung ulang berdasarkan data menu terkini; harga dari klien diabaikan.
- **Pesanan dibatalkan pelanggan:** hanya dapat dilakukan selama status `AWAITING_PAYMENT` → status `CANCELED`; voucher menjadi bebas kembali.
- **Voucher dinonaktifkan setelah ditempel:** voucher yang sudah terbit (`ACTIVE`) tetap sah (manfaat tersnapshot).

### 8.8 Alur Konfirmasi / Penolakan Pesanan (Kasir)
1. Kasir membuka **Antrean Pesanan** untuk outlet penugasannya, dengan filter status.
2. Kasir membuka detail pesanan: daftar item + opsi/tag, catatan, voucher yang dipakai, total, dan pratinjau bukti transfer.
3. Kasir **mengonfirmasi** pembayaran → dalam satu transaksi: status pesanan `AWAITING_CONFIRMATION → IN_PROGRESS`, bukti terakhir menjadi `ACCEPTED`, `OrderPayment` menjadi `PAID`, dan **voucher (bila ada) diubah `USED` secara atomik** (`WHERE status = 'ACTIVE'`) dengan mencatat `usedAt`, `usedByCashierId`, `usedAtOutletId`; aksi dicatat pada `AuditLog`.
4. Kasir **menolak** pembayaran (alasan wajib) → status pesanan `AWAITING_CONFIRMATION → REJECTED`, bukti menjadi `REJECTED`, `OrderPayment` menjadi `FAILED`; **voucher tidak dikonsumsi**; aksi dicatat pada `AuditLog`.
5. Kasir **menandai selesai** saat pesanan siap diambil → status `IN_PROGRESS → COMPLETED`; aksi dicatat pada `AuditLog`.

**Edge case yang ditangani:**
- **Dua kasir mengonfirmasi bersamaan:** pembaruan kondisional `WHERE status = 'AWAITING_CONFIRMATION'` membuat hanya satu yang berhasil.
- **Voucher sudah tidak `ACTIVE` saat konfirmasi:** konfirmasi menolak voucher tersebut dengan pesan yang jelas (tidak ada konsumsi ganda).
- **Pesanan ditolak lalu diunggah ulang:** status kembali ke `AWAITING_CONFIRMATION`, riwayat bukti tersimpan, voucher tetap bebas.
- **Kasir dari outlet lain:** hanya dapat melihat/menindak pesanan outlet penugasannya.

### 8.9 Kesiapan Pembayaran Daring (Catatan, belum aktif pada v1)
Seluruh pembayaran melewati entitas `OrderPayment` yang provider-agnostic. Transfer manual (`MANUAL_TRANSFER`) adalah satu-satunya metode pada v1. Gateway daring (mis. Midtrans) nantinya ditambahkan sebagai **adapter** di sisi server beserta route webhook yang memverifikasi tanda tangan dan bersifat idempoten, kemudian memetakan status pembayaran ke status pesanan — **tanpa migrasi skema**. Antarmuka adapter dan route webhook disiapkan sebagai stub (belum aktif) pada fase implementasi.

---

## 9. Non-Functional Requirements (NFR)

| Aspek | Spesifikasi |
|---|---|
| **Responsivitas Kamera** | Modul pemindai kamera web kasir (`html5-qrcode`) harus mampu membaca kode QR/Barcode dalam rentang waktu ≤ 1,5 detik pada kondisi pencahayaan toko standar F&B. |
| **Performa Mutasi Poin** | Proses injeksi poin end-to-end (dari konfirmasi kasir hingga saldo ter-update) selesai < 4 detik; halaman utama pelanggan dimuat ≤ 2,5 detik pada jaringan 4G standar. |
| **Integritas & Konkurensi** | Seluruh mutasi saldo poin, kuota reward, dan transisi status pesanan wajib dieksekusi menggunakan *Prisma Interactive Transactions* dengan pembaruan kondisional (memastikan `pointsBalance` tidak pernah negatif; status pesanan hanya bertransisi dari fase saat ini). Validasi voucher menggunakan pembaruan atomik `WHERE status = 'ACTIVE'` agar jaminan *single-use* tetap berlaku saat dua kasir memindahkan voucher yang sama secara bersamaan. Saat checkout, baris `Voucher` dikunci (*row lock*) agar satu voucher tidak dapat ditempelkan ke dua pesanan aktif. |
| **Idempotensi & Anti Klik Ganda** | Setiap operasi injeksi poin membawa *idempotency key* unik yang divalidasi di server (retry jaringan tidak menggandakan poin). Di sisi klien: pop-up konfirmasi, tombol *disabled* selama proses, dan *debounce*. Pembayaran (termasuk webhook gateway kelak) mengandalkan `OrderPayment.providerRef`/`idempotencyKey` yang unik agar notifikasi ganda tidak menggandakan efek. |
| **Cooldown Injeksi Poin** | Jeda minimal 60 detik antar-injeksi poin untuk pelanggan yang sama, divalidasi di sisi server (nilai dapat dikonfigurasi tanpa mengubah skema). Permintaan dalam periode cooldown ditolak dengan pesan sisa waktu tunggu yang jelas bagi kasir. |
| **Batas Waktu Pembayaran** | Pesanan belanja memiliki tenggat bayar **24 jam** (`ORDER_PAYMENT_WINDOW_MINUTES`, default 1440, dapat dikonfigurasi). Hanya pesanan berstatus `AWAITING_PAYMENT` yang kedaluwarsa; setelah bukti diunggah, tenggat tidak berlaku. Kedaluwarsa ditegakkan secara *lazy* saat data pesanan diakses (tanpa worker/cron), menandai pesanan `EXPIRED` dan membebaskan voucher. |
| **Keamanan Endpoint API** | Seluruh rute `/api/cashier/*` wajib dilindungi middleware dengan validasi sesi role `CASHIER` atau `SUPER_ADMIN`; seluruh rute `/api/admin/*` wajib role `SUPER_ADMIN`. Server Actions memvalidasi origin request (proteksi CSRF). Rute `/api/webhook/*` tidak memakai sesi, melainkan **verifikasi tanda tangan** provider dan idempotensi. |
| **Proteksi Injeksi SQL (SQL Injection)** | Seluruh akses database melalui Prisma ORM yang secara bawaan menggunakan *parameterized query*; dilarang menyusun query dengan interpolasi string. Query mentah hanya boleh memakai `$queryRaw`/`$executeRaw` dengan *tagged template* berparameter — `$queryRawUnsafe` dan `$executeRawUnsafe` dilarang. Setiap field input yang menyentuh database (username, kode voucher, kata kunci pencarian, email, nomor telepon, kode pesanan) wajib divalidasi skema (Zod) dan dibatasi tipe serta panjangnya di server; karakter wildcard (`%`, `_`) pada pencarian di-escape; nilai untuk pengurutan/filter dinamis hanya boleh berasal dari daftar putih (*whitelist*); akun database aplikasi memakai hak akses minimal (*least privilege*) tanpa hak DDL. |
| **Keamanan Autentikasi** | Rate limiting login: maksimal 5 percobaan gagal per 15 menit per kombinasi email + IP, diikuti *lockout* sementara; kata sandi di-hash dengan algoritma modern; verifikasi email wajib sebelum aktivasi akun; token reset kata sandi sekali pakai dengan masa berlaku 30 menit. |
| **Rate Limiting Endpoint Publik** | Cek ketersediaan username: maks 20 permintaan/menit per IP. Registrasi akun: maks 5 akun/jam per IP. Permintaan email transaksional (verifikasi/reset): maks 5 email per akun per hari dengan jeda minimal 60 detik antar permintaan. Pembuatan pesanan belanja: maks 10/jam per pelanggan. Unggah bukti transfer: maks 10/jam per pelanggan. Pelanggaran menerima respons 429 dengan pesan yang ramah pengguna. |
| **Kuota Email Transaksional** | Seluruh email dikirim via Gmail SMTP yang memiliki batas bawaan (±500 penerima/hari untuk Gmail gratis; ±2.000/hari untuk Google Workspace). Ketika volume harian mendekati 50% kapasitas, migrasi ke penyedia email khusus (mis. Resend) disiapkan sebagai jalur peningkatan. |
| **Manajemen Sesi** | Sesi pelanggan berlaku 30 hari (sliding refresh); sesi staf berlaku 12 jam dengan *idle timeout* 30 menit pada perangkat kasir bersama. Cookie bersifat `httpOnly`, `secure`, dan `sameSite=lax`. Sesi dicabut otomatis saat akun dinonaktifkan atau kata sandi diubah. |
| **Keunikan & Keamanan Kode** | Kode voucher digenerate dengan format `DJN-` + 16 karakter acak berentropi tinggi dari alfabet non-ambigu (tanpa `0/O/1/I/L` agar aman diinput manual). Kode pesanan digenerate dengan format `ORD-` + 10 karakter dari alfabet yang sama. Validasi status selalu dicek langsung ke database, dilengkapi rate limiting 10 kegagalan pemindaian/input per menit per kasir untuk mencegah enumerasi kode. |
| **Unggahan Media** | Gambar promo/menu: JPG/PNG/WebP, maksimal 5 MB. Bukti transfer: JPG/PNG/WebP, maksimal 5 MB, diunggah ke Cloudinary melalui Server Action dengan tanda tangan server; valiadasi tipe & ukuran dilakukan di server. |
| **PWA & Mode Offline** | Antarmuka web pelanggan lolos kriteria *Installable Web App* (Web App Manifest + Service Worker). Mode offline menyajikan *cache* aplikasi, QR Code akun, dan saldo poin terakhir (read-only); seluruh aksi mutasi (klaim voucher, pemesanan, login) memerlukan koneksi dengan indikator status jaringan, disertai halaman *fallback* offline. |
| **Kompatibilitas Perangkat** | Target resmi: Chrome (Android) dan Safari (iOS) dua versi terakhir. Kamera hanya aktif pada konteks aman (HTTPS). Aplikasi mendeteksi *in-app browser* (Instagram/WhatsApp/TikTok) dan menampilkan arahan "Buka di Browser"; kolom input `username` manual selalu tersedia sebagai *fallback* universal. |
| **Zona Waktu & Lokalisasi** | Seluruh batas harian/bulanan, agregasi "per jam kerja", laporan, dan tenggat pembayaran menggunakan zona **Asia/Makassar (WITA, UTC+8)**; data disimpan dalam UTC dan ditampilkan dalam WITA. Antarmuka berbahasa Indonesia dengan format Rupiah (`id-ID`) dan format tanggal lokal. |
| **Skalabilitas & Observabilitas** | Semua daftar data (voucher, pesanan, menu, audit log, pelanggan) menggunakan paginasi server-side (default 50 baris/halaman) dengan filter dan ekspor CSV untuk audit log. Pelacakan error runtime (Sentry), pemantauan uptime, dan backup basis data harian wajib aktif. |
| **Aksesibilitas** | Kontras warna memenuhi standar WCAG AA; elemen QR Code dan Barcode ditampilkan dengan ukuran layar besar dan tingkat kecerahan maksimum agar mudah dipindai; struktur navigasi sederhana untuk pengguna lintas usia; tombol melayang (FAB) memiliki nama aksesibel dan tidak menutupi konten. |
| **Kualitas Web (Lighthouse)** | Audit Lighthouse mode mobile untuk aplikasi pelanggan wajib memperoleh skor ≥ 90 pada kategori Performance, Accessibility, Best Practices, dan SEO sebelum rilis produksi; diaudit ulang pada setiap rilis besar. |

### 9.1 Strategi Pengujian & Kriteria Penerimaan

| Lapis | Cakupan |
|---|---|
| **Unit (Vitest)** | Validasi username (format + *reserved words*), logika saldo poin, generator kode voucher/pesanan, utilitas zona waktu WITA, perhitungan harga & potongan belanja, tenggat pembayaran. |
| **Integration** | Transaksi atomik injeksi poin (idempotency, cooldown), penukaran voucher (saldo & kuota), validasi voucher tunggal di bawah permintaan simultan, pembuatan pesanan (harga otoritatif, kunci voucher), kedaluwarsa pesanan & pelepasan voucher, konfirmasi pesanan (konsumsi voucher sekali), rate limiting, pembatalan/koreksi admin. |
| **E2E (Playwright)** | Alur kritis: registrasi + verifikasi email → login → injeksi poin via QR & username → tukar voucher → validasi voucher oleh kasir (termasuk skenario voucher sudah terpakai) → **alur belanja: admin buat kategori/menu/rekening → pelanggan memesan + tempel voucher + unggah bukti → kasir konfirmasi → selesai (dan skenario tolak → unggah ulang)** → alur suspend & koreksi admin. |
| **Perangkat & Kamera** | Uji pemindaian QR/Barcode pada perangkat nyata: Android (Chrome) dan iOS (Safari), termasuk kondisi pencahayaan rendah. |
| **Performa** | Audit Lighthouse mode mobile untuk aplikasi pelanggan (target seluruh kategori ≥ 90); verifikasi waktu respons sesuai NFR (injeksi ≤ 4 detik end-to-end). |
| **Gerbang Rilis** | Seluruh pengujian lulus, audit Lighthouse memenuhi target, dan uji coba terbatas di satu outlet selesai tanpa insiden kritis. |

---

## 10. Kepatuhan & Privasi (UU PDP)

| Aspek | Ketentuan |
|---|---|
| **Persetujuan (Consent)** | Saat registrasi, pengguna wajib menyetujui Kebijakan Privasi dan Syarat & Ketentuan program loyalitas sebelum akun dibuat. |
| **Data yang Dikumpulkan** | Nama, email, nomor telepon (opsional), domisili, foto profil (bila via Google), riwayat transaksi poin, dan riwayat pesanan belanja (termasuk bukti transfer). Data yang dikumpulkan dibatasi pada kebutuhan operasional program loyalitas (*data minimization*). |
| **Kebijakan Retensi** | Usulan default: data akun disimpan selama akun aktif dan hingga 24 bulan sejak aktivitas terakhir, setelah itu dianonimkan (dapat disesuaikan oleh owner). |
| **Hak Subjek Data** | Pengguna berhak mengakses, mengoreksi, dan meminta penghapusan akun. Permintaan penghapusan diproses oleh Super Admin melalui penonaktifan akun + anonimisasi data pribadi; riwayat transaksi poin dapat dipertahankan dalam bentuk anonim untuk keperluan audit. |
| **Kontrol Akses Internal** | Kasir hanya melihat data pelanggan seperlunya (nama & username) pada injeksi poin; pada pesanan belanja, kasir melihat data yang diperlukan untuk memproses pesanan (nama pengambil, item, bukti transfer). Data pribadi lain (email, nomor telepon, domisili) hanya dapat diakses oleh Super Admin. |
| **Dokumen Publik** | Halaman Kebijakan Privasi dan Syarat & Ketentuan program loyalitas wajib tersedia di aplikasi pelanggan; konten disiapkan dan dikelola oleh Super Admin (pada v1 ditampilkan sebagai halaman statis). |

---

## 11. Asumsi, Dependensi & Out of Scope

### Asumsi
- Prinsip "1 Transaksi = 1 Poin" dijalankan atas dasar kejujuran kasir, dengan pengaman berlapis: cooldown, idempotency, dan audit log lengkap; tanpa integrasi langsung ke sistem POS.
- **Belanja tidak memberi poin otomatis** — poin tetap hanya dari injeksi manual kasir.
- Konfirmasi pembayaran pesanan belanja **manual** oleh kasir (meninjau bukti transfer); tidak ada verifikasi otomatis pada v1.
- Pelanggan memiliki ponsel pintar dengan kamera dan alamat email aktif.
- Meja kasir memiliki koneksi internet yang stabil; perangkat kasir mendukung peramban modern.
- Angka operasional pada dokumen ini (cooldown 60 detik, retensi data 24 bulan, tenggat bayar 24 jam) berlaku sebagai nilai final hingga ditinjau ulang oleh owner; target kuantitatif adopsi ditetapkan menjelang rilis.

### Dependensi
- Akun Google Workspace/Gmail aktif untuk pengiriman email transaksional (SMTP) dengan kapasitas harian terbatas (±500–2.000 email/hari); jalur peningkatan ke penyedia email khusus (mis. Resend) disiapkan bila volume bertumbuh.
- Akun Cloudinary untuk penyimpanan gambar promo, gambar menu, dan bukti transfer.
- Domain, sertifikat SSL, dan akun hosting Vercel.
- Instans PostgreSQL terkelola (managed) beserta kebijakan backup.

### Out of Scope (v1)
- Integrasi langsung dengan sistem POS/kasir eksisting.
- Aplikasi *native* (Play Store/App Store).
- Program berjenjang (tiering/level), referral, dan gamifikasi.
- Notifikasi *push*/WhatsApp untuk kampanye marketing.
- **Gateway pembayaran daring otomatis (mis. Midtrans) dan e-wallet otomatis** — *di luar cakupan v1*; namun **konfirmasi pembayaran transfer manual (unggah bukti transfer) masuk cakupan**, dan skema `OrderPayment` disiapkan agar gateway dapat ditambahkan kemudian tanpa migrasi destruktif.
- Pengiriman pesanan (delivery) dan perhitungan ongkos kirim — pesanan diambil di outlet.
- Multi-bahasa selain Bahasa Indonesia.

---

## 12. Timeline & Milestone

| Fase | Kegiatan | Durasi |
|---|---|---|
| **Fase 1: Fondasi & Basis Data** | Inisialisasi Next.js 16, konfigurasi PostgreSQL & Prisma ORM, arsitektur skema DB (User, Outlet, Reward, Voucher, PointTransaction, AuditLog), Better-Auth (email + kata sandi, Google OAuth, username, verifikasi email, reset kata sandi, role), integrasi Gmail SMTP, seed Super Admin pertama. | 5 hari |
| **Fase 2: Customer Portal** | Halaman pendaftaran (validasi *unique username* + reserved words), dashboard profil poin, generator QR Code akun, katalog promo (kuota/limit/periode/S&K), dompet voucher + kode manual, pengaturan akun, integrasi PWA. | 4 hari |
| **Fase 3: Cashier Portal** | Antarmuka pemindai kamera web kasir (QR), injeksi manual username, pop-up konfirmasi + *debounce* + idempotency server + cooldown, validasi voucher (scan & input kode manual), proteksi anti-spam. | 4 hari |
| **Fase 4: Voucher & Redemption** | Logika pemotongan saldo transaksional (anti saldo negatif), pengurangan kuota atomik, validasi *single-use* kondisional, alur pembatalan/pengembalian poin, koreksi admin. | 3 hari |
| **Fase 5: Admin, Hardening & Rilis** | Dashboard analitik (WITA), audit log + ekspor CSV, manajemen akun staf/pelanggan/outlet, pengujian skenario konkurensi & fraud, uji pemindaian lintas perangkat, audit Lighthouse mobile, security hardening, deployment Vercel. | 5 hari |
| **Fase 6: Belanja & Integrasi Voucher** | Kategori menu & menu (grup opsi/tag), rekening pembayaran, katalog belanja + keranjang + checkout (tempel voucher), pembuatan pesanan dengan tenggat bayar, unggah bukti transfer, antrean & aksi kasir (konfirmasi/tolak/selesai), kontrak adapter pembayaran (stub), pengujian. | — |
| **Total** | | **21 hari** (belum termasuk *buffer* uji coba pengguna di gerai dan Fase 6) |

---

## 13. Kriteria Keberhasilan (Success Metrics)

- Proses injeksi poin di meja kasir (sejak pemindaian atau ketik username hingga tersimpan) selesai dalam waktu rata-rata di bawah 4 detik sehingga tidak mengganggu antrean kasir.
- Tingkat kegagalan transaksi poin atau insiden saldo minus bernilai 0% melalui penerapan *atomic database updates*, idempotency, dan cooldown.
- Tingkat adopsi program loyalitas meningkat secara organik karena pelanggan tidak terbebani proses pengunduhan aplikasi dari app store; diukur melalui jumlah member terdaftar dan tingkat transaksi ulang dalam 30 hari (target spesifik ditetapkan bersama owner sebelum rilis).
- Operasional POS kasir utama berjalan sepenuhnya tanpa interupsi teknis karena ketiadaan ketergantungan API langsung antarsistem.
- Nol insiden voucher *single-use* yang berhasil divalidasi ganda (dua kali penggunaan) sepanjang periode operasional, termasuk pada pemakaian di pesanan belanja.
- Nol insiden satu voucher terpakai pada dua pesanan aktif, dan nol insiden voucher hilang akibat pesanan ditolak/kedaluwarsa.
- Skor audit Lighthouse mode mobile untuk aplikasi pelanggan ≥ 90 pada seluruh kategori (Performance, Accessibility, Best Practices, SEO), diuji ulang pada setiap rilis besar.

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Rencana Mitigasi |
|---|---|---|
| **Kecurangan Injeksi Poin oleh Kasir** | Kasir menambahkan poin secara sepihak ke akun pribadi atau kerabat tanpa transaksi riil. | Cooldown 60 detik per pelanggan + idempotency key mencegah injeksi beruntun; seluruh transaksi merekam `cashierId`, `outletId`, dan metode input. Super Admin memantau anomali volume penambahan poin per jam kerja (WITA) melalui audit log dan dapat menonaktifkan akun bersangkutan. |
| **Duplikasi Poin akibat Retry Jaringan** | Koneksi terputus saat transaksi dapat memicu pengiriman ulang permintaan dan poin ganda. | *Idempotency key* unik pada setiap operasi injeksi divalidasi di server; permintaan dengan key yang sama hanya diproses sekali. |
| **Kamera Kasir Gagal Memindai Layar Pelanggan** | Layar ponsel pelanggan buram, pecah, atau pengaturan kecerahan terlalu rendah. | Disediakan mekanisme *fallback* wajib: kasir cukup menginput `username` unik pelanggan (untuk poin) atau kode alfanumerik voucher (untuk redemption) secara manual. |
| **Jaringan Internet Pelanggan Lambat di Gerai** | Pelanggan membutuhkan waktu lama untuk membuka website saat berada di meja kasir. | Mengonfigurasi Service Worker PWA agar aset inti dashboard, representasi QR Code akun, dan saldo terakhir tersimpan di *cache* lokal peramban ponsel pelanggan. |
| **Pemalsuan Barcode Promo** | Pihak tidak berwenang mencoba menebak string barcode voucher untuk mendapatkan diskon ilegal. | Kode voucher `DJN-` + 16 karakter acak non-sekuensial (entropi tinggi), validasi status `ACTIVE` secara langsung ke database, serta rate limiting 10 kegagalan pemindaian/input per menit per kasir untuk mencegah enumerasi. |
| **Balapan Validasi Voucher (Race Condition)** | Dua kasir memindai voucher yang sama secara hampir bersamaan sehingga diskon ganda tereksekusi, atau satu voucher terpakai pada dua pesanan. | Pembaruan status bersifat atomik dan kondisional (`UPDATE ... WHERE status = 'ACTIVE'`); saat checkout, baris voucher dikunci (*row lock*) dan dicek terhadap pesanan aktif. Hanya satu permintaan yang berhasil, sisanya menerima notifikasi "voucher telah terpakai". |
| **Bukti Transfer Palsu / Tidak Sesuai** | Pelanggan mengunggah bukti transfer yang tidak valid sehingga pesanan diproses tanpa pembayaran. | Konfirmasi manual oleh kasir; penolakan wajib disertai alasan; seluruh bukti tersimpan (riwayat) dan tercatat pada audit log; pesanan yang melewati tenggat otomatis `EXPIRED`. |
| **Voucher Hilang akibat Pesanan Gagal** | Voucher ditempel ke pesanan yang kemudian ditolak/kedaluwarsa. | Voucher **tidak dikonsumsi** di checkout; status `USED` hanya ditetapkan saat konfirmasi pembayaran. Pesanan `REJECTED`/`EXPIRED` tidak menghalangi pemakaian ulang voucher. |
| **Kebocoran Data Pribadi Pelanggan** | Data email/nomor telepon pelanggan terekspos pihak tidak berwenang. | Enkripsi transport (HTTPS), *role-based access control* ketat, pembatasan data yang terlihat kasir, sesi dengan cookie aman, serta kepatuhan UU PDP (Bagian 10). |
| **Serangan Injeksi SQL (SQL Injection)** | Penyerang memanipulasi query database melalui field input (form registrasi, pencarian username kasir, input kode voucher/kode pesanan manual, filter audit log) untuk membaca atau mengubah data. | Seluruh query melalui Prisma ORM dengan *parameterized query*; query mentah hanya berparameter; validasi & pembatasan input menyeluruh di server (Zod); escape wildcard pencarian; whitelist nilai filter/sort; hak akses database minimal; monitoring error query dan percobaan anomali. |
| **Perangkat Kasir Bersama Tidak Di-logout** | Perangkat tablet bersama di gerai berpotensi dipakai pihak lain atas nama kasir sebelumnya. | Sesi staf 12 jam dengan *idle timeout* 30 menit; akun kasir hanya dapat dibuat/dinonaktifkan oleh Super Admin dan dapat dihentikan sesinya secara paksa. |

---

## 15. Glossary

| Istilah | Definisi |
|---|---|
| **POS (Point of Sales)** | Sistem perangkat keras dan lunak utama di gerai Donjun Donat yang bertugas mencatat penjualan barang dan menerima pembayaran uang/kartu. |
| **PWA (Progressive Web App)** | Aplikasi web yang dibangun dengan standar modern sehingga mampu diakses via browser sekaligus dapat diinstal pada beranda layar ponsel selayaknya aplikasi native. |
| **QR Code Identitas** | Matriks kode 2 dimensi pada akun pelanggan yang menyimpan data referensi `username` untuk mempermudah identifikasi profil oleh kamera kasir. |
| **Barcode Voucher** | Representasi kode batang optik 1 dimensi (Code 128) yang diterbitkan setelah penukaran poin untuk divalidasi keabsahan promo diskonnya. |
| **Single-use** | Kebijakan sistem di mana setiap kupon/barcode yang telah berhasil tervalidasi akan secara permanen ditandai terpakai dan tidak dapat diklaim ulang. |
| **Atomic Transaction** | Serangkaian operasi basis data yang diperlakukan sebagai satu kesatuan tunggal: jika pemotongan poin berhasil namun pembuatan voucher gagal, seluruh operasi dibatalkan untuk menjaga konsistensi saldo. |
| **SQL Injection (SQLi)** | Teknik serangan dengan menyisipkan perintah SQL berbahaya melalui field input untuk memanipulasi query database. Pada PostgreSQL, kelas kerentanan ini tetap bernama SQL Injection; pencegahannya melalui *parameterized query* (Prisma ORM), validasi input di server, dan hak akses database minimal. |
| **Idempotency Key** | Kunci unik yang dikirimkan bersama permintaan mutasi sehingga pengiriman ulang permintaan yang sama (misalnya akibat koneksi terputus) tidak menghasilkan efek ganda di database. |
| **Cooldown** | Interval jeda minimal yang diberlakukan sistem sebelum pelanggan yang sama dapat menerima injeksi poin kembali, divalidasi di sisi server. |
| **Outlet** | Gerai fisik Donjun Donat tempat transaksi berlangsung; poin dan voucher pelanggan berlaku global, namun setiap transaksi operasional dicatat per outlet. |
| **Belanja** | Modul pemesanan menu Donjun Donat secara daring oleh pelanggan, untuk diambil di outlet terpilih. |
| **Pesanan (Order)** | Satu transaksi belanja pelanggan yang berisi satu atau lebih item menu beserta opsi dan catatan, dengan status berfase (menunggu pembayaran, menunggu konfirmasi, diproses, selesai, ditolak, kedaluwarsa, dibatalkan). |
| **Bukti Transfer** | Gambar tangkapan pembayaran transfer manual yang diunggah pelanggan sebagai dasar konfirmasi kasir. |
| **Kategori Menu** | Pengelompokan menu belanja (mis. "Donat", "Minuman") yang dikelola Super Admin dan dipakai untuk menyusun katalog. |
| **Grup Opsi / Tag** | Kustomisasi pada menu belanja: grup opsi (mis. "Rasa") berisi tag pilihan (mis. "Coklat", "Keju"); bersifat opsional, multi-pilih, dan boleh menambah harga. |
| **Rekening Pembayaran** | Rekening tujuan transfer manual (bank/e-wallet/QRIS) yang dikelola Super Admin dan ditampilkan saat checkout. |
| **Tenggat Pembayaran** | Batas waktu (default 24 jam, `ORDER_PAYMENT_WINDOW_MINUTES`) untuk pelanggan mengunggah bukti transfer sebelum pesanan berstatus `EXPIRED`. |
| **Payment Gateway** | Penyedia pembayaran daring (mis. Midtrans) yang dapat ditambahkan kemudian melalui entitas `OrderPayment` provider-agnostic tanpa mengubah model `Order`. |
| **Reserved Username** | Daftar `username` yang diblokir dari pendaftaran karena menyerupai nama sistem, peran pengguna, atau identitas resmi brand (contoh: `admin`, `kasir`, `owner`, `donjun`, `official`), guna mencegah penyalahgunaan identitas dan konflik rute sistem. |
| **WITA (Waktu Indonesia Tengah)** | Zona waktu **Asia/Makassar (UTC+8)** yang digunakan sebagai acuan seluruh operasional dan pelaporan sistem. |
| **UU PDP** | Undang-Undang Perlindungan Data Pribadi Indonesia sebagai dasar kebijakan pengelolaan data pelanggan pada platform ini. |

---

## Lampiran A — Spesifikasi Validasi Username

### A.1 Aturan Format
- Panjang 8–20 karakter.
- Hanya boleh huruf kecil `a-z`, angka `0-9`, titik `.`, dan garis bawah `_`.
- Wajib diawali huruf; tidak boleh diakhiri titik atau garis bawah.
- Pola regex: `^[a-z][a-z0-9._]{6,18}[a-z0-9]$`.
- Berlaku *case-insensitive*: `Budi.Donat` dan `budi.donat` dianggap sama; disimpan dalam huruf kecil dengan *unique index* di database.

### A.2 Daftar Reserved Username (Diblokir)

| Kategori | Username |
|---|---|
| **Peran & Administrasi** | `admin`, `administrator`, `superadmin`, `super_admin`, `superuser`, `owner`, `manager`, `moderator`, `root`, `master`, `system`, `sys`, `kasir`, `cashier`, `staff`, `staf`, `pegawai` |
| **Fungsi Sistem & Autentikasi** | `login`, `logout`, `register`, `registration`, `signin`, `signup`, `daftar`, `masuk`, `auth`, `authorize`, `session`, `password`, `sandi`, `reset`, `verify`, `verifikasi`, `aktivasi`, `api`, `webhook`, `callback`, `oauth`, `sso`, `token`, `otp` |
| **Halaman & Fitur Aplikasi** | `dashboard`, `home`, `beranda`, `profile`, `profil`, `akun`, `account`, `settings`, `pengaturan`, `help`, `bantuan`, `support`, `contact`, `kontak`, `info`, `about`, `scan`, `voucher`, `promo`, `reward`, `poin`, `points`, `loyalty`, `member`, `membership`, `diskon`, `kupon`, `barcode`, `qrcode`, `belanja`, `keranjang`, `pesanan`, `menu`, `kategori`, `pembayaran`, `order`, `transaksi`, `cart` |
| **Brand & Identitas Resmi** | `donjun`, `donjundonat`, `donjun_donat`, `donjun.donat`, `official`, `resmi`, `brand`, `store`, `toko`, `outlet`, `gerai` |
| **Umum & Teknis** | `test`, `testing`, `demo`, `sample`, `contoh`, `user`, `username`, `customer`, `pelanggan`, `guest`, `tamu`, `anonymous`, `null`, `undefined`, `mail`, `email`, `smtp`, `sms`, `whatsapp`, `bot`, `cron`, `server`, `database` |

Daftar ini dikelola sebagai konstanta terpusat dan dapat diperluas kapan pun tanpa perubahan skema database.

### A.3 Ketentuan Implementasi
1. Validasi berjalan dua lapis: di sisi klien untuk umpan balik *real-time* saat mengetik, dan wajib divalidasi ulang di sisi server saat submit (validasi klien tidak pernah dipercaya).
2. Pengecekan ketersediaan `username` memakai endpoint khusus dengan *debounce* ±400 ms untuk menghindari spam permintaan.
3. Pesan penolakan bersifat spesifik bagi pengguna: "username sudah digunakan" atau "username mengandung kata yang tidak diizinkan".
4. Pengecekan tetap divalidasi ulang secara final melalui *unique constraint* database pada saat pembuatan akun.

---

## Lampiran B — Peta Route Aplikasi

| Area | Route | Akses |
|---|---|---|
| **Publik** | `/` (landing), `/kebijakan-privasi`, `/syarat-ketentuan` | Semua pengunjung |
| **Autentikasi** | `/masuk`, `/daftar`, `/lupa-sandi`, `/reset-sandi`, `/verifikasi-email` | Tamu (belum login) |
| **Pelanggan** | `/dashboard` (saldo + QR Code), `/belanja` (katalog menu), `/belanja/[menuId]` (detail + opsi), `/keranjang` (keranjang + checkout), `/pesanan` (daftar pesanan), `/pesanan/[orderCode]` (detail + unggah bukti), `/promo`, `/voucher`, `/pengaturan` | `CUSTOMER` |
| **Kasir** | `/kasir/scan` (QR & input username), `/kasir/validasi` (scan barcode & kode manual), `/kasir/pesanan` (antrean pesanan), `/kasir/pesanan/[id]` (detail + konfirmasi/tolak/selesai), `/kasir/riwayat` | `CASHIER`, `SUPER_ADMIN` |
| **Admin** | `/admin` (analitik), `/admin/kategori`, `/admin/menu`, `/admin/menu/baru`, `/admin/menu/[id]`, `/admin/reward`, `/admin/pembayaran`, `/admin/pesanan` (opsional), `/admin/staf`, `/admin/pelanggan`, `/admin/outlet`, `/admin/audit` | `SUPER_ADMIN` |
| **Webhook** | `/api/webhook/[provider]` (mis. Midtrans; belum aktif pada v1) | Verifikasi tanda tangan provider (tanpa sesi) |

Catatan: pengguna yang sudah login dan membuka `/` diarahkan ke area sesuai perannya; seluruh route area dijaga middleware berdasarkan role. Route webhook tidak memakai sesi melainkan verifikasi tanda tangan provider.

---

## Lampiran C — Environment Variables

Daftar lengkap tersedia pada berkas **`.env.example`** di root repositori (disalin menjadi `.env.local` saat development; nilai produksi diatur pada dashboard Vercel). Secret tidak boleh di-commit ke repositori.

| Variabel | Kegunaan |
|---|---|
| `NODE_ENV` | Mode lingkungan aplikasi |
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi untuk antarmuka pelanggan |
| `NEXT_PUBLIC_BASE_URL` | URL dasar aplikasi |
| `NEXT_PUBLIC_SITE_URL` | URL kanonik untuk metadata/OG image (produksi: domain resmi) |
| `DATABASE_URL` | String koneksi PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret penandatanganan sesi Better-Auth |
| `BETTER_AUTH_URL` | Base URL layanan autentikasi |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Kredensial Google OAuth |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Kredensial Gmail SMTP |
| `EMAIL_FROM` | Nama & alamat pengirim email transaksional |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Penyimpanan gambar promo, gambar menu, dan bukti transfer |
| `SENTRY_DSN` | Pelacakan error runtime |
| `POINT_COOLDOWN_SECONDS` | Cooldown injeksi poin per pelanggan (default: 60) |
| `ORDER_PAYMENT_WINDOW_MINUTES` | Batas waktu pembayaran pesanan belanja dalam menit (default: 1440 = 24 jam) |

> **Rencana (fase gateway, bukan v1):** `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` — dicatat di sini saat gateway pembayaran daring diaktifkan.

---

*Dokumen ini merupakan panduan spesifikasi resmi untuk pengembangan Platform Loyalitas Donjun Donat.*
