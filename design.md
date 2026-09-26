# Design System Specification (design.md)

## Brand Identity & UI Design Guidelines — Donjun Donat Loyalty Web App

**Versi Dokumen: 1.0** · **Tanggal: 2026-09-26** · Mengikuti zona waktu operasional WITA

### Dokumen Terkait

| Dokumen | Fungsi |
|---|---|
| **`PRD.md`** | Sumber kebenaran produk: fitur, alur, skema database, NFR (§9 menetapkan target kontras WCAG AA) |
| **`AGENTS.md`** | Aturan kerja agen & developer (implementasi mengikuti dokumen ini) |
| **`design.md`** (dokumen ini) | Sumber kebenaran desain visual: warna, tipografi, komponen, surface khusus, aksesibilitas |
| **`.env.example`** | Daftar environment variable |

### Riwayat Revisi

| Versi | Tanggal | Ringkasan Perubahan |
|---|---|---|
| 1.0 | 2026-09-26 | Versi final berbasis draf owner: perbaikan kontras (step warna tambahan), pemetaan token ke shadcn/ui, token tipografi/spacing/elevasi/motion, spesifikasi komponen & status, surface QR/Barcode/Scanner, aturan aksesibilitas & responsive. |

---

## 1. Brand Essence & Atmosphere

- **Brand Values:** Kehangatan keluarga, kebahagiaan berbagi (*"kotak kecil, kebahagiaan besar"*), keaslian bahan, dan kenyamanan.
- **Visual Mood:** Warm, Friendly, Delightful, Playful yet Clean (Artisanal Bakery & Family Picnic Theme).
- **Design Philosophy:** Antarmuka harus terasa manis dan menyambut layaknya memasuki toko donat fisik, namun tetap rapi dan ringkas saat digunakan bertransaksi di meja kasir.

---

## 2. Register: Brand vs Product

Dua register diterapkan pada area berbeda — jangan tertukar:

| Area | Register | Karakter |
|---|---|---|
| **Pelanggan** (landing, dashboard, promo, voucher) | **Brand** | Hangat, playful, ilustratif. Warna brand dipakai penuh; motion halus diperbolehkan; momen selebrasi (poin bertambah, voucher terbit) boleh ekspresif. |
| **Kasir** (scan, validasi) | **Product** | Cepat, tegas, tenang. Warna brand hanya di aksen tombol utama; tanpa animasi dekoratif; target sentuh besar; kontras status maksimal (hijau/merah + ikon + teks). |
| **Admin** (backoffice) | **Product** | Padat dan netral. Komponen shadcn/ui default dipakai apa adanya; warna brand untuk aksen navigasi dan angka penting saja. |

Aturan: keputusan visual pada area pelanggan tidak boleh "menular" ke kasir/admin bila menambah friksi kecepatan atau kejelasan.

---

## 3. Color Palette (Design Tokens)

### 3.1 Core Brand Colors

| Nama Token | Hex | HSL | Penggunaan |
|---|---|---|---|
| `brand-yellow` | `#F6DE8C` | `47° 85% 76%` | **Primary Brand Color**: latar aksen, kartu sorotan, banner selamat datang. |
| `brand-yellow-light` | `#FDF8E8` | `44° 86% 95%` | **App Background**: latar dasar halaman pelanggan (menggantikan putih polos agar tidak silau). |
| `brand-orange` | `#EE8838` | `26° 84% 58%` | **Action Fill**: isian tombol CTA utama, badge poin, elemen aktif. **Bukan warna teks** (lihat §3.4). |
| `brand-orange-deep` | `#9A4A0E` | — | **Action Text/Icon**: teks tautan, ikon aksi, teks di atas latar terang. Aman AA. |
| `brand-brown-dark` | `#452A18` | `24° 48% 18%` | **Primary Text**: tipografi utama, border tegas bergaya ilustrasi, focus ring. |
| `brand-brown-muted` | `#7D5B41` | `26° 31% 37%` | **Secondary Text**: subtitle, label tanggal, placeholder, deskripsi promo. |
| `brand-white` | `#FFFFFF` | `0° 0% 100%` | **Card & Container**: kartu QR/voucher, input, dialog, toast. |

### 3.2 Semantic & Status Colors

| Nama Token | Hex | Penggunaan |
|---|---|---|
| `donut-matcha` | `#7FA668` | Isian status sukses (ikon, chip, progress), aksen hijau kue tradisional. |
| `donut-matcha-deep` | `#4F6B3F` | **Teks/ikon** sukses di atas latar terang (aman AA). |
| `donut-berry` | `#D64545` | Isian status error/peringatan ringan (selai stroberi). |
| `donut-berry-deep` | `#B33A3A` | **Tombol destruktif & teks error** (kontras aman dengan teks putih). |
| `sky-pastel` | `#BEE3F8` | Latar aksen sekunder untuk banner informatif (latar piknik tepi danau). |

### 3.3 Warna Pendukung Netral

| Nama | Hex | Penggunaan |
|---|---|---|
| `warm-neutral` | `#F6EEE4` | Latar `muted` (baris bergantian, area nonaktif). |
| `warm-border` | `#E8DCC2` | Garis pemisah dekoratif, border kartu (non-interaktif). |

### 3.4 Aturan Kontras (diukur WCAG 2.x, target AA sesuai PRD §9)

| Pasangan | Rasio | Putusan |
|---|---|---|
| `brand-brown-dark` di atas `brand-yellow-light` | 12,4:1 | Lolos AAA |
| `brand-brown-dark` di atas `brand-yellow` | 9,9:1 | Lolos AAA |
| `brand-brown-dark` di atas `brand-orange` | **5,1:1** | Lolos AA — **pasangan baku teks tombol primary** |
| `brand-brown-muted` di atas `brand-yellow-light` | 5,7:1 | Lolos AA |
| `brand-brown-dark` di atas `sky-pastel` | 9,7:1 | Lolos AAA |
| `brand-orange-deep` di atas `brand-yellow-light` / putih | 5,9:1 / 6,2:1 | Lolos AA — untuk teks tautan & ikon aksi |
| `donut-matcha-deep` di atas putih | 6,0:1 | Lolos AA — untuk teks/ikon sukses |
| Putih di atas `brand-orange` | 2,6:1 | **DILARANG** untuk teks apa pun |
| Putih di atas `donut-matcha` | 2,8:1 | **DILARANG** untuk teks apa pun |
| Putih di atas `donut-berry` | 4,4:1 | Hanya teks besar/ikon; teks normal gunakan `donut-berry-deep` (5,9:1) |
| Putih di atas `brand-yellow` | 1,3:1 | **DILARANG** untuk teks apa pun |

**Aturan turunan:**
1. Isian warna brand (`brand-orange`, `brand-yellow`, `donut-matcha`) selalu dipasangkan dengan teks `brand-brown-dark` — bukan putih.
2. Warna tidak pernah menjadi satu-satunya pembawa makna: setiap status juga membawa ikon dan/atau teks (§8).
3. Perubahan warna brand hanya melalui revisi dokumen ini — jangan menimpa warna di level komponen.

---

## 4. Token Tailwind CSS 4 + shadcn/ui

```css
@import "tailwindcss";

:root {
  /* ---- Warna brand ---- */
  --brand-yellow: #f6de8c;
  --brand-yellow-light: #fdf8e8;
  --brand-orange: #ee8838;
  --brand-orange-deep: #9a4a0e;
  --brand-brown-dark: #452a18;
  --brand-brown-muted: #7d5b41;
  --brand-white: #ffffff;
  --donut-matcha: #7fa668;
  --donut-matcha-deep: #4f6b3f;
  --donut-berry: #d64545;
  --donut-berry-deep: #b33a3a;
  --sky-pastel: #bee3f8;
  --warm-neutral: #f6eee4;
  --warm-border: #e8dcc2;

  /* ---- Peran semantik (dipakai komponen shadcn/ui) ---- */
  --background: var(--brand-yellow-light);
  --foreground: var(--brand-brown-dark);
  --card: var(--brand-white);
  --card-foreground: var(--brand-brown-dark);
  --popover: var(--brand-white);
  --popover-foreground: var(--brand-brown-dark);
  --primary: var(--brand-orange);
  --primary-foreground: var(--brand-brown-dark);
  --secondary: var(--brand-yellow);
  --secondary-foreground: var(--brand-brown-dark);
  --muted: var(--warm-neutral);
  --muted-foreground: var(--brand-brown-muted);
  --accent: var(--brand-yellow);
  --accent-foreground: var(--brand-brown-dark);
  --destructive: var(--donut-berry-deep);
  --destructive-foreground: var(--brand-white);
  --success: var(--donut-matcha);
  --success-foreground: var(--donut-matcha-deep);
  --info: var(--sky-pastel);
  --info-foreground: var(--brand-brown-dark);
  --border: var(--warm-border);
  --input: var(--brand-brown-muted);
  --ring: var(--brand-brown-dark);

  /* ---- Radius ---- */
  --radius: 1.25rem;
  --radius-badge: 9999px;
  --radius-card: 1.25rem;
  --radius-button: 0.875rem;

  /* ---- Elevasi ---- */
  --shadow-card: 0 2px 8px rgb(69 42 24 / 0.08);
  --shadow-raised: 0 12px 32px rgb(69 42 24 / 0.18);

  /* ---- Motion ---- */
  --motion-fast: 150ms;
  --motion-base: 250ms;
  --motion-slow: 400ms;
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Palet brand untuk pemakaian langsung (bg-brand-yellow, text-brand-orange-deep, dst.) */
  --color-brand-yellow: var(--brand-yellow);
  --color-brand-yellow-light: var(--brand-yellow-light);
  --color-brand-orange: var(--brand-orange);
  --color-brand-orange-deep: var(--brand-orange-deep);
  --color-brand-brown-dark: var(--brand-brown-dark);
  --color-brand-brown-muted: var(--brand-brown-muted);
  --color-donut-matcha: var(--donut-matcha);
  --color-donut-matcha-deep: var(--donut-matcha-deep);
  --color-donut-berry: var(--donut-berry);
  --color-donut-berry-deep: var(--donut-berry-deep);
  --color-sky-pastel: var(--sky-pastel);
  --color-warm-neutral: var(--warm-neutral);
  --color-warm-border: var(--warm-border);

  /* Font */
  --font-display: "Baloo 2", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", system-ui, sans-serif;

  /* Radius */
  --radius-badge: 9999px;
  --radius-card: 1.25rem;
  --radius-button: 0.875rem;
}
```

Catatan implementasi:
- Nama token di seluruh dokumen, kode, dan komponen harus identik (satu sumber). Jangan memakai alias berbeda untuk warna yang sama.
- Font dimuat via `next/font` (self-hosted) untuk menghindari layout shift; `cursive` tidak dipakai sebagai fallback.
- Jalankan generator shadcn/ui lalu sesuaikan nilainya dengan blok di atas — jangan biarkan token default abu-abu tersisa.

---

## 5. Typography

**Keluarga font:**
- `font-display` — **Baloo 2** (600/700): judul, angka besar, momen brand.
- `font-body` — **Plus Jakarta Sans** (400/500/600/700): seluruh teks isi dan antarmuka.

| Token | Ukuran / Line-height | Berat | Penggunaan |
|---|---|---|---|
| `text-display` | 2,5rem / 1,1 | Baloo 2 · 700 | Angka saldo poin utama, angka hero landing |
| `text-h1` | 1,75rem / 1,2 | Baloo 2 · 700 | Judul halaman |
| `text-h2` | 1,375rem / 1,25 | Baloo 2 · 600 | Judul seksi, judul kartu besar |
| `text-h3` | 1,125rem / 1,3 | Baloo 2 · 600 | Judul kartu promo, nama reward |
| `text-body` | 1rem / 1,6 | Plus Jakarta · 400 | Teks utama, deskripsi |
| `text-body-sm` | 0,875rem / 1,5 | Plus Jakarta · 400 | Teks sekunder, Syarat & Ketentuan |
| `text-caption` | 0,8125rem / 1,4 | Plus Jakarta · 500 | Label kecil, metadata tanggal |
| `text-voucher-code` | 1,125rem / 1,3 · tracking 0,08em | Plus Jakarta · 700 | Kode alfanumerik voucher (huruf kapital) |

**Aturan:** setiap blok teks mengikuti tiga lapis (judul → pendukung → isi). Ukuran minimum 16px untuk seluruh `input`/`select`/`textarea` pada layar < 640px. Panjang baris isi 60–76 karakter. Ganti em dash dengan koma, titik dua, atau kalimat baru. Semua label status enum memakai kamus label terpusat (AGENTS.md). Media query memakai `rem`; border/fokus/bayangan memakai `px`. Aturan lain: pemisah ribuan dan mata uang memakai locale `id-ID`; angka saldo/poin memakai `tabular-nums` agar stabil saat berubah; teks error tidak pernah mengandalkan warna saja.

---

## 6. Spacing, Radius & Elevasi

**Skala jarak** (kelipatan 4; kanonik 1-4-9):

| Token | Nilai | Penggunaan |
|---|---|---|
| `space-1` | 4px | Jarak mikro (ikon-teks, dalam kontrol) |
| `space-2` | 8px | Antarelemen rapat |
| `space-3` | 12px | Padding kontrol kecil |
| `space-4` | 16px | Padding kartu standar, jarak antar-komponen |
| `space-6` | 24px | Jarak antar-blok dalam satu seksi |
| `space-9` | 36px | Jarak antar-seksi (makro) |
| `space-12` | 48px | Pemisah halaman besar |
| `space-16` | 64px | Hero / area momen brand |

**Radius:** `radius-badge` 9999px (chip/pil), `radius-card` 1.25rem (kartu, dialog, sheet), `radius-button` 0.875rem.

**Elevasi:** `shadow-card` untuk kartu di atas `brand-yellow-light`; `shadow-raised` untuk dialog/sheet/toast. Kartu wajib memiliki `shadow-card` dan/atau border `warm-border` agar terpisah dari latar (kontras permukaan putih vs kuning hanya ±1,06:1).

---

## 7. Motion

| Token | Durasi | Easing | Penggunaan |
|---|---|---|---|
| `motion-fast` | 150ms | ease-out | Umpan balik tekan, hover, toggle |
| `motion-base` | 250ms | ease-out | Fade konten, toast, dialog, transisi antar-halaman |
| `motion-slow` | 400ms | ease-out | Entrance hero/seksi saat scroll |

**Aturan:** hanya menganimasikan `transform` dan `opacity`; entrance memakai fade + naik 8px; tekan tombol memakai skala 0,98; exit berjalan ±70% durasi entrance; transisi hanya diaktifkan di dalam `@media (prefers-reduced-motion: no-preference)`. **Area kasir tanpa animasi dekoratif** — hasil pemindaian tampil seketika. Motion tidak boleh menunda render konten utama maupun menutupi informasi status.

---

## 8. Komponen Inti & Status

**Aturan umum:** setiap komponen dirancang untuk semua keadaan: istirahat, hover, aktif, fokus, memuat, kosong, galat, nonaktif, luapan data. Fokus keyboard wajib memakai `:focus-visible` (ring `--ring`, tebal 2px, offset 2px). Target sentuh minimum 44×44px; kasir 48–56px. Tombol penuh-lebar pada layar pelanggan. Jangan mematikan tombol submit hanya karena formulir belum valid. Label form selalu terlihat (placeholder bukan label).

| Komponen | Spesifikasi ringkas |
|---|---|
| **Button** | `primary`: isian `brand-orange`, teks `brand-brown-dark`, tinggi 48 (dasar) / 56 (aksi kasir); `secondary`: isian putih, border `brand-brown-muted`, teks `brand-brown-dark`; `ghost`: tanpa isian; `destructive`: isian `donut-berry-deep`, teks putih. Memuat: spinner + label asli dipertahankan. Nonaktif: opasitas 40% + alasan bila perlu. |
| **Input** | Isian putih, border `brand-brown-muted` (kenampakan kontrol), radius button; fokus ring; galat = border `donut-berry-deep` + ikon + teks pesan di bawah field (`aria-describedby`). |
| **Card** | Putih, radius card, border `warm-border`, `shadow-card`, padding 16–24. |
| **Badge / Chip** | Pil (`radius-badge`), ikon + label + warna (bukan warna saja). |
| **Dialog** | Elemen `<dialog>` native; fokus masuk saat dibuka, kembali ke pemicu saat ditutup; konfirmasi destruktif memfokuskan aksi paling tidak berbahaya. |
| **Toast (`sonner`)** | Permukaan putih, ikon status + judul + pesan; sukses memakai `donut-matcha-deep`, galat `donut-berry-deep`; `role="status"`; galat tidak menutup otomatis. |
| **Tabel (admin)** | Header sticky, baris padat 44px, angka `tabular-nums`, aksi baris eksplisit (bukan ikon tanpa label). |
| **Skeleton & Empty State** | Wajib untuk setiap pemuatan data; empty state menjelaskan isi ruang dan aksi pengisinya. |

**Peta status terpusat** (warna + ikon + label; label dari kamus `src/constants`):

| Status | Warna | Ikon | Label Indonesia |
|---|---|---|---|
| `ACTIVE` (voucher) | `donut-matcha-deep` | centang | "Aktif" |
| `USED` | `brand-brown-muted` | centang ganda / riwayat | "Terpakai" |
| `CANCELED` | `donut-berry-deep` | silang | "Dibatalkan" |
| `EARN` | `donut-matcha-deep` | plus | "Poin masuk" |
| `REDEEM` | `brand-orange-deep` | minus | "Poin terpakai" |
| `ADJUST` | `brand-brown-muted` | penyetel | "Koreksi admin" |
| `REVERSAL` | `sky-pastel` + `brand-brown-dark` | panah balik | "Pengembalian poin" |

---

## 9. Surface Khusus Produk

### 9.1 QR Code Akun (Pelanggan)

- Modul **hitam `#000000` di atas putih `#FFFFFF`** (bukan warna brand) — kontras maksimal untuk pemindai.
- Kartu khusus putih, tanpa hiasan di belakang kode; area tenang (*quiet zone*) minimal 4 modul; ukuran render minimum 240px pada layar 375px.
- Tampilkan payload hanya dalam bentuk kode: `DONJUN:v1:<username>` (sesuai PRD).
- Saat kode ditampilkan: naikkan kecerahan layar ke maksimum dan aktifkan *wake lock*; sediakan tombol "Perbesar".
- Di mode offline, QR tetap tampil dari cache; sertakan indikator koneksi ("Tampilan terakhir").

### 9.2 Kartu Voucher & Barcode (Pelanggan)

- Kartu putih berisi: judul reward (`rewardTitle`), badge status, barcode Code 128, kode alfanumerik (`text-voucher-code`), instruksi "Tunjukkan kepada kasir sebelum membayar".
- Barcode: hitam di atas putih, tinggi batang minimum 80px, lebar penuh kartu; kode teks selalu tercetak di bawah barcode untuk input manual kasir.
- Kecerahan maksimum + *wake lock* saat kartu dibuka; tombol "Tampilkan ke kasir" membuka tampilan penuh layar putih.

### 9.3 Viewport Scanner (Kasir)

- Kamera penuh (*full-bleed*) dengan bingkai pemindaian; tombol senter (*torch*) selalu tersedia.
- Tombol "Input kode manual" selalu terlihat di zona jempol, tidak tersembunyi di menu.
- Kamera ditolak / *in-app browser*: tampilkan panduan izin dan arahan "Buka di browser", lalu arahkan ke input manual.

### 9.4 Hasil Validasi Voucher (Kasir)

- **Sah:** hijau `donut-matcha-deep` + ikon centang + teks "Voucher sah" + instruksi "Potong harga di POS" — tampil seketika, ukuran besar, tanpa animasi menunggu.
- **Gagal:** merah `donut-berry-deep` + ikon silang + alasan spesifik ("Sudah terpakai pada [waktu WITA]", "Voucher dibatalkan", "Kode tidak ditemukan").
- **Cooldown injeksi poin:** tampilkan sisa waktu tunggu dalam teks + ikon jam; tombol aktif kembali otomatis.
- Tidak memakai emoji; status selalu warna + ikon + teks.

### 9.5 Dialog Konfirmasi Injeksi Poin (Kasir)

- Menampilkan nama + username pelanggan (hanya dua data ini), tombol utama "Tambah 1 Poin" tinggi 56px, tombol batal berukuran sama di posisi sekunder (aksi paling tidak berbahaya menerima fokus awal).

---

## 10. Responsive & Layout

| Viewport | Prioritas | Tata letak |
|---|---|---|
| **375px** (ponsel pelanggan) | Mobile-first | Satu kolom; aksi utama di zona jempol (25% bawah); navigasi bawah maksimal 4 item; konten QR/voucher tanpa elemen mengganggu. |
| **768px** (tablet kasir, lanskap) | Kecepatan | Dua zona: kiri viewport kamera besar, kanan panel hasil/riwayat; tombol tinggi 56px; hindari scroll horizontal. |
| **1024px+** (admin) | Kepadatan | Sidebar navigasi + area konten; tabel penuh; filter di atas tabel. Lebar konten maksimum 1440px. |

Aturan: hormati `env(safe-area-inset-*)` pada PWA; deteksi input (`pointer: coarse`) untuk ukuran sentuh; tidak ada fungsi yang hanya dapat diakses lewat hover; uji reflow pada 320px dan zoom 200%.

---

## 11. Aksesibilitas

1. Fokus keyboard selalu terlihat (`:focus-visible`, ring 2px offset 2px) dan urutan tab masuk akal.
2. Target sentuh minimum 44×44px; tidak ada dua target yang tumpang tindih.
3. Status tidak pernah disampaikan warna saja — selalu ikon/teks.
4. Semua input memiliki label nyata dan atribut `autocomplete` yang tepat; font input ≥16px pada layar kecil.
5. Galat formulir tampil di samping field, diumumkan (`aria-describedby`, `aria-invalid`), dan memindahkan fokus ke field pertama yang gagal.
6. Dialog menahan fokus, menutup dengan Escape, dan mengembalikan fokus ke pemicu.
7. Animasi menghormati `prefers-reduced-motion`; tidak ada gerakan otomatis yang tak bisa dihentikan.
8. Semua konten berfungsi pada zoom 200% dan reflow 320px tanpa scroll horizontal.
9. Gambar promosi memiliki `alt` sesuai fungsinya; ikon dekoratif `aria-hidden`.
10. Tombol ikon selalu memiliki nama aksesibel (teks terlihat lebih diutamakan daripada `aria-label`).

---

## 12. Ilustrasi, Logo & Aset

- **Ilustrasi:** goresan hangat bergaya *artisanal* (donat, piknik, meja kue) hanya di area pelanggan; proporsional, tidak menutupi konten penting, dan tidak pernah berada di belakang QR/barcode.
- **Foto promo:** rasio 4:3 (kartu katalog) atau 1:1 (thumbnail); diunggah via Cloudinary dengan `f_auto,q_auto` (WebP/AVIF otomatis); tanpa *watermark*; `alt` deskriptif Bahasa Indonesia.
- **Logo:** versi utama di atas latar terang; area bebas minimum setinggi satu huruf "D"; jangan mengubah warna logo di atas foto.
- **PWA:** `theme_color` `#F6DE8C`, `background_color` `#FDF8E8`; ikon *maskable* dengan zona aman 80%.

---

## 13. Voice & Copywriting

- Bahasa Indonesia formal; kalimat perintah ringkas; huruf kapital di awal kalimat (bukan Title Case).
- Satu kata kerja per tombol: "Tukar poin", "Tambah 1 Poin", "Batalkan voucher", "Tampilkan ke kasir". Hindari "OK", "Ya", "Proses".
- Galat menjelaskan apa yang gagal, mengapa bila relevan, dan langkah berikutnya; jangan menyalahkan pengguna.
- Empty state mengajarkan: sebut isi ruang, manfaatnya, dan aksi untuk mengisinya.
- Teks pemuatan menyebut pekerjaan nyata ("Memuat voucher", "Memverifikasi kode") — bukan "Loading".
- Tanpa tanda seru dan tanpa emoji pada antarmuka; nominal memakai Rupiah `id-ID`; waktu ditampilkan WITA.

---

*Dokumen ini merupakan sumber kebenaran desain visual untuk pengembangan Platform Loyalitas Donjun Donat. Perubahan visual wajib melalui revisi dokumen ini.*
