# Review Report: Donjun Donat Loyalty

**Surface:** Seluruh antarmuka: `(public)` landing, `(auth)`, `(customer)` (beranda, promo, voucher, belanja, keranjang, pesanan, pengaturan), `kasir` (scan, validasi, pesanan, riwayat), `admin` (analitik, kategori, menu, reward, pembayaran, pesanan, staf, pelanggan, outlet, audit)
**Mode:** `/design review`
**Tanggal:** 2026-10-15
**Register:** Brand (pelanggan) + Product (kasir & admin), design.md §2
**Alur utama yang ditelusuri:** landing → daftar → QR akun → injeksi poin kasir → tukar poin → validasi voucher kasir → belanja → keranjang/checkout → unggah bukti → konfirmasi kasir → selesai

---

## Overall

**Score: 37 / 50** · **Verdict: BLOCK**

Ini produk yang punya sudut pandang. Aturan desain ditulis sebagai sumber kebenaran (`design.md`), lalu
benar-benar ditegakkan di kode: palet diukur kontrasnya, status selalu warna + ikon + label, motion
dibatasi `transform`/`opacity` dan dibungkus `motion-safe:`, copy memakai Bahasa Indonesia yang spesifik,
dan setiap permukaan membawa artefak domain nyata (kartu QR, barcode Code 128, kartu saldo, antrean
pesanan, tenggat WITA). Komposisi mengikuti pola kerja, bukan kebiasaan: antrean padat untuk Monitor,
kamera penuh untuk Operate, form terkelompok untuk Configure.

Satu temuan `HIGH` berdiri dan memblokir: **tombol submit dimatikan selama input belum valid** di dua
form, yang justru mematikan jalur galat yang sudah ditulis di kode itu sendiri. Temuan `MEDIUM` pada
tipografi: skala tipe design.md §5 tidak pernah dijadikan token, dan langkah caption dirender 12px
(bukan 13px yang ditetapkan).

**TL;DR.** Arah desainnya kuat dan konsisten; yang gagal adalah satu aturan affordance formulir yang
diulang, plus skala tipe yang tidak diimplementasikan.

---

## Lens Scores

| # | Lensa | Nilai | Temuan kunci |
|---|---|---|---|
| 1 | First impression | 8 / 10 | Hero asimetris dengan pratinjau voucher nyata (barcode + kode alfabet non-ambigu, `page.tsx:26,175`) dan kartu saldo poin. Kategori langsung terbaca. Punggung yang jelas: cincin donat + palet hangat. |
| 2 | Hierarchy | 7 / 10 | Setiap halaman memakai pola tetap judul → subjudul → konten; hasil validasi voucher tampil besar dan seketika (`validate-voucher-panel.tsx:164`). Titik lemah: beranda pelanggan menumpuk tiga blok berbobot mirip (saldo, kartu "Pesanan saya", kartu QR) tanpa penekanan pada artefak utamanya (`dashboard/page.tsx:36`). |
| 3 | Color voice | 9 / 10 | Warna dijalankan sebagai sistem, bukan hiasan: token dengan tabel kontras terukur (design.md §3.4), status tidak pernah warna saja (`order-status-badge.tsx:71`, `voucher-card.tsx:101`), urgensial tenggat memakai ikon + teks (`payment-deadline.tsx:28`). Nol hue AI di seluruh `src/`. |
| 4 | Type voice | 6 / 10 | Pasangan Baloo 2 + Plus Jakarta Sans disengaja dan pas. Tetapi skala design.md §5 tidak diimplementasikan: `globals.css` tidak mendefinisikan satu pun token `--text-*`, dan langkah caption dirender `text-xs` 12px, bukan `text-caption` 0.8125rem (128 kemunculan di 54 file). |
| 5 | Interaction feel | 7 / 10 | Keadaan lengkap dan ditulis matang: skeleton untuk setiap pemuatan, galat kamera terklasifikasi (`code-scanner.tsx:43`), dialog `<dialog>` native dengan fokus ke aksi paling tidak berbahaya (`inject-points-dialog.tsx:211`), cooldown dengan hitung mundur. Dirusak oleh temuan `HIGH` di bawah. |
| | **Total** | **37 / 50** | |

---

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `components/customer/upload-proof-form.tsx:132`, `components/kasir/validate-voucher-panel.tsx:121` | Tombol submit dimatikan selama input belum valid: `disabled={isSubmitting \|\| !file}` dan `disabled={result.kind === "loading" \|\| code.trim().length === 0}` | Biarkan tombol aktif; validasi saat submit dan tampilkan galat inline yang sudah ada (`FormAlert` pada unggah bukti, pesan galat pada panel validasi) | design.md §8 eksplisit: "Jangan mematikan tombol submit hanya karena formulir belum valid." Bukti terkuatnya: jalur galat sudah ditulis dan menjadi kode mati. `upload-proof-form.tsx:59` memeriksa `if (!file) setMessage(...)` dan `validate-voucher-panel.tsx:101` memeriksa `if (code.trim().length > 0)`, keduanya tidak pernah tercapai karena tombolnya mati. Sebab tunggal, dua lokasi |
| 2 | MEDIUM | Type | `app/globals.css` (nol token `--text-*`), `components/customer/order-card.tsx:25`, `components/kasir/order-queue-card.tsx:36`, `app/kasir/riwayat/page.tsx:85`, `app/admin/audit/page.tsx:305`, dan 50 file lain | Skala tipe design.md §5 (`text-display`/`h1`/`h2`/`h3`/`body`/`body-sm`/`caption`/`voucher-code`) tidak diwakili di CSS; komponen memakai ukuran Tailwind ad-hoc. Metadata dan tanggal dirender `text-xs` 12px, sedangkan token berlaku 0.8125rem (13px) | Definisikan skala sebagai token (`@theme`: `--text-display`, `--text-caption`, dst.) dan ganti pemakaian `text-xs` pada metadata/tanggal dengan langkah caption | Sumber kebenaran menetapkan skala tujuh langkah dengan alasan; kode memakai skala default Tailwind, sehingga "langkah caption" hilang dan teks sekunder turun 1px dari spesifikasi. Hierarki judul juga jadi ad-hoc (`text-2xl`, `text-lg`) alih-alih `text-h1`/`text-h2` |
| 3 | LOW | Writing | `lib/format.ts:42`, `app/admin/audit/page.tsx:59,98,117,272,319,325`, `app/admin/outlet/page.tsx:96,137`, `app/admin/pembayaran/page.tsx:25,114,162`, `app/admin/pelanggan/[id]/page.tsx:233` | Em dash `—` dipakai sebagai penanda nilai kosong di teks yang dirender | Ganti dengan kata ("Tidak ada", "Tidak tersedia") atau penanda non-dash | design.md §5 dan §13 melarang em dash dan menyebut penggantinya. Disatukan karena akarnya satu: util `formatPercent` (`format.ts:42`) mengembalikan `—`, lalu setiap tabel menyalin kebiasaan yang sama |
| 4 | LOW | Surface | 126 kemunculan `border-border` / `bg-muted` / `divide-border` di 56 file, mis. `app/admin/audit/page.tsx:229,256`, `components/kasir/kasir-nav.tsx:32`, `app/kasir/riwayat/page.tsx:73`, berdampingan dengan `border-warm-border` / `bg-warm-neutral` | Dua kosakata token untuk nilai yang identik (`globals.css:45` menetapkan `--border: var(--warm-border)`) | Pilih satu nama per nilai (arahkan ke `--warm-border` / `--warm-neutral`) di seluruh komponen | design.md §4: "Nama token di seluruh dokumen, kode, dan komponen harus identik (satu sumber). Jangan memakai alias berbeda untuk warna yang sama." Tidak ada selisih visual hari ini; biayanya adalah kosakata kedua yang akan menyimpang saat token diubah |

---

## Priority Issues, urut dampak

**1. Tombol submit yang mati selama input belum valid (`HIGH`).** Ini satu-satunya hal yang menahan
persetujuan, dan perbaikannya kecil: aktifkan tombol, validasi saat submit, tampilkan galat inline yang
sudah tersedia. Dua lokasi: unggah bukti transfer (alur pembayaran pelanggan) dan input kode voucher
manual (jalur cadangan kasir saat kamera ditolak atau barcode rusak, tepat pada momen kasir paling
tertekan). Mitigasi yang ada: instruksi unggah tercetak di atas tombol, dan input kosong terlihat tepat
di atasnya. Karena itu dampak rasanya lebih ringan daripada label `HIGH`, tetapi aturannya tertulis
eksplisit dan berpola, dan ia mematikan jalur galat yang sudah dirancang. Saya tidak menurunkannya.

**2. Skala tipe tidak diimplementasikan (`MEDIUM`).** Perbaikan di akar token akan merapikan seluruh
permukaan sekaligus, termasuk hierarki judul yang kini ad-hoc. Jalankan `/design typeset`.

**3. Dua kebersihan yang bisa digabung (`LOW`).** Em dash dan alias token. Keduanya murah, keduanya
menutup celah antara dokumen dan kode.

Temuan `MEDIUM` dari laporan smell sebelumnya tetap terbuka dan tidak saya ulang di sini: primitive
`src/components/ui/*` belum disesuaikan ke design.md §8. Jalankan `/design tokenize`.

---

## What's Working

- **Artefak domain sebagai bukti.** Kartu QR (`account-qr-card.tsx`), barcode Code 128 dengan kode teks
  untuk input manual kasir (`voucher-card.tsx:46,121`), kartu saldo poin (`page.tsx:149`), tenggat
  pembayaran WITA (`payment-deadline.tsx:29`). Tidak ada satu pun yang bisa dipindahkan ke produk lain
  tanpa menjadi salah.
- **Komposisi mengikuti pekerjaan.** Antrean kasir memakai border penuh bernuansa status untuk memindai
  cepat (`order-queue-card.tsx:15`), kamera penuh lebar dengan senter di zona jempol
  (`code-scanner.tsx:334`), scanner tetap menyediakan "Input kode manual" yang selalu terlihat
  (`validate-voucher-panel.tsx:130`), form admin terkelompok per konsekuensi.
- **Status dan galat tidak pernah mengandalkan warna.** Kamus label terpusat, ikon selalu hadir, galat
  form memakai `role="alert"` dan `aria-describedby` (`form-alert.tsx:19`,
  `order-decision-actions.tsx:210`).
- **Copy yang bekerja.** Teks pemuatan menyebut pekerjaan nyata ("Memeriksa QR...", "Memvalidasi
  voucher..."), empty state mengajari ruangnya dan menyertakan aksi pengisi, satu kata kerja per tombol,
  tanpa tanda seru.
- **Jalur pemulihan tertulis.** Dialog injeksi memisahkan fase `idle/pending/success/cooldown/error`,
  menahan Escape saat proses berjalan, dan menyediakan hitung mundur cooldown
  (`inject-points-dialog.tsx:94,139`).

---

## Considered but Rejected

| Location | Kandidat | Ditolak karena |
|---|---|---|
| `components/customer/cart-view.tsx:562` | Tombol "Buat pesanan" mati saat belum ada outlet/rekening | Pemicunya prasyarat sistem yang tidak dapat diperbaiki pelanggan dengan mengetik, dan alasannya tampil di `FormAlert` tepat di atas tombol. Berbeda dari temuan `HIGH` yang mati karena input pengguna sendiri |
| `app/(customer)/dashboard/page.tsx:36` | Tiga blok berbobot mirip di beranda | Setiap blok punya peran berbeda (saldo, pintu ke pelacakan, artefak utama); kartu QR adalah blok terbesar, terakhir, dan paling beraksi. Ditandai sebagai pelemah skor Hierarchy, bukan temuan |
| `components/customer/customer-bottom-nav.tsx:40` | Label navigasi `text-xs` | design.md §10 mengunci maksimal 4 item pada target ≥ 48px di lebar 375px; memperbesar label akan memaksa salah satunya keluar |
| `app/(auth)/layout.tsx:8`, `app/not-found.tsx:14` | Komposisi terpusat pada form auth dan 404 | Artefak tunggal berfokus; simetri adalah jawaban yang benar di sini, dan halaman lain tetap asimetris |
| `design.md:53` | Palet hangat oranye sebagai refleks pertama kategori makanan | Nilai diambil apa adanya dari sumber kebenaran brand. Perbaikannya arah seni (`/design voice`), bukan penggantian token |
| `components/kasir/validate-voucher-panel.tsx:45` | `busyRef` tidak direset pada jalur format kode salah | Terpulihkan: hasil `invalid` menampilkan tombol "Validasi voucher lain" yang memanggil `reset()`. Bukan jalan buntu, dan bukan temuan desain |

---

## Verification

**Diperiksa (source).** Karena tidak ada sesi peramban, seluruh penilaian di atas berasal dari kode,
nilai token, dan struktur yang dapat dibaca, bukan dari render:

- Membaca dengan nomor baris: `layout.tsx`, `not-found.tsx`, `globals.css`, `lib/format.ts`,
  `(public)/page.tsx`, `(auth)/{layout,masuk/page,login-form,text-field,form-alert}.tsx`,
  `(customer)/{layout,dashboard,promo,belanja,pesanan}/page.tsx`,
  `components/customer/{account-qr-card,voucher-card,reward-card,order-card,payment-deadline,upload-proof-form,cart-view,menu-detail-view,shop-fab,shop-menu-card,order-status-badge,customer-header,customer-bottom-nav}.tsx`,
  `components/kasir/{validate-voucher-panel,scan-panel,inject-points-dialog,code-scanner,order-queue-card,order-decision-actions,kasir-nav,kasir-header}.tsx`,
  `kasir/{layout,riwayat/page}.tsx`, `admin/{page,audit/page}.tsx`,
  `components/admin/{metric-card,loyal-customers-card,admin-nav,reward-form}.tsx`,
  `components/ui/{card,button,input,textarea,label}.tsx`.
- Grep `disabled=\{...\}` pada `src/components`: 8 kemunculan, diklasifikasi menjadi 2 pelanggaran
  validitas input, 3 prasyarat sistem, dan 3 batas aturan bisnis yang sah.
- Grep em dash: 126 kemunculan; dipisahkan menjadi komentar kode (bukan UI) dan 13 kemunculan di teks
  yang dirender.
- Grep alias token: 126 kemunculan di 56 file.
- Grep `text-xs`: 128 kemunculan di 54 file. Grep `--text-`/`font-size` pada `globals.css`: 0 hasil.
- Grep hue AI dan tema gelap: 0 hasil, tanpa mekanisme tema gelap.

**Tidak diverifikasi (gap, bukan temuan).** review.md menuntut agar saya tidak menyatakan hal yang tidak
saya amati, jadi daftar ini penting:

- **First impression tidak dilihat sebagai render.** Skor 8/10 dan penyebutan "cincin donat + palet
  hangat" berasal dari struktur JSX dan nilai token, bukan dari tangkapan layar. Ini pelemah terbesar
  dari laporan ini.
- Reflow 320px, zoom 200%, dan perilaku teks yang diperbesar.
- Kontras terukur dengan alat, bukan estimasi dari tabel design.md §3.4.
- Kenampakan nyata cincin fokus, urutan tab, dan langkah keyboard pada alur injeksi, validasi, dan
  checkout.
- Pengumuman pembaca layar atas `aria-live` pada hasil validasi dan cooldown injeksi.
- Motion yang sebenarnya berjalan (kelas `motion-safe:` belum dilihat bergerak).

---

## Verdict

**BLOCK** (skor review 37/50)

Ada satu temuan `HIGH` yang masih berdiri: dua tombol submit yang dimatikan selama input belum valid,
yang sekaligus mematikan jalur galat yang sudah dirancang di kode. Selama itu belum diperbaiki,
persetujuan tidak diberikan. Sisa pekerjaan adalah `MEDIUM` (skala tipe dan primitive generator) dan dua
`LOW` (em dash, alias token).

Saran urutan: `/design a11y` untuk temuan `HIGH`, lalu `/design typeset`, lalu `/design tokenize` untuk
menyatukan primitive dan alias token sekaligus, dan `/design writing` untuk penanda nilai kosong. Mode
ini tidak mengubah kode dan hanya membuat dua artefak laporan.
