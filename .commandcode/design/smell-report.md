# Smell Report — Donjun Donat Loyalty

**Surface:** Seluruh antarmuka aplikasi — `(public)` landing, `(auth)`, `(customer)` (dashboard, promo, voucher, belanja, keranjang, pesanan, pengaturan), `kasir` (scan, validasi, pesanan, riwayat), `admin` (analitik, kategori, menu, reward, pembayaran, pesanan, staf, pelanggan, outlet, audit)
**Mode:** `/design smell`
**Tanggal:** 2026-10-15
**Register:** Brand (pelanggan) + Product (kasir & admin), design.md §2

---

## Overall

**Score: 8 / 10 — FAINT**

Sembilan dari sepuluh odor yang dilacak **absen**. Permukaan ini punya keputusan yang tidak bisa
ditebak dari kategorinya saja: palet hangat yang ditetapkan sebagai sumber kebenaran brand,
pasangan tipografi dengan alasan (Baloo 2 sebagai suara brand), komposisi hero asimetris, dan
bukti berupa artefak domain nyata (kartu QR, barcode Code 128, kartu saldo poin, antrean pesanan,
tenggat pembayaran WITA). Satu tell terkonfirmasi: **primitive shadcn/ui dibiarkan pada nilai
default generator** (`card`, `button`, `input`, `textarea`) sehingga setiap pemanggil harus
menambal sendiri radius, border, dan tinggi kontrol.

**Root reflex.** Bukan refleks warna atau tipe, melainkan refleks **"biarkan hasil generator apa
adanya"** — lima dari lima komponen `src/components/ui/*` tidak disesuaikan, padahal design.md §4
tegas menyatakan token default wajib diganti dan seluruh sisa aplikasi memang dibangun tangan ke
token. Efek terlihatnya terbatas (kartu di 6 layar auth dan 4 kartu admin/analitik memakai radius
dan garis tepi yang berbeda dari token kartu), tetapi sumbernya satu dan menyebar lewat komponen
bersama.

**TL;DR.** Tidak ada `HIGH`. Satu temuan `MEDIUM` terbuka: `Card`/`Button`/`Input`/`Textarea`
belum disesuaikan ke design.md §8, dan `globals.css` menyisakan scaffolding tema gelap
(`@custom-variant dark`, token `sidebar`/`chart`) yang tidak pernah dipakai.

**Rekomendasi utama.** Jalankan `/design tokenize` untuk menarik spec Card/Button/Input dari
design.md §8 ke dalam primitive `src/components/ui/*` (radius kartu, `border-warm-border`,
`shadow-card`, tinggi kontrol 48/56) lalu hapus scaffolding tema gelap yang mati. Audit ulang
setelah perubahan. Bila ingin sekaligus menjauh dari jawaban pertama kategori makanan (hangat
oranye), jalankan `/design voice`; itu arah seni, bukan penggantian token.

---

## Heuristic Scores

| # | Heuristik | Nilai | Temuan kunci |
|---|---|---|---|
| 1 | Tech gradient | 1 | Absen. Nol utilitas gradien; tidak ada biru-ungu, indigo, atau cyan di `src/` (grep: 0 hasil). Glow hero memakai `brand-yellow` + `sky-pastel` (`page.tsx:226`). |
| 2 | Generic tech hue | 1 | Absen. Identitas oranye/kuning/cokelat dari palet brand; tidak ada hue biru-ungu sebagai warna primer. |
| 3 | Feature tile grid | 1 | Absen. "Kenapa bergabung" tetap broken grid (satu manfaat dominan + daftar berdivider, `page.tsx:339`); "Cara mengumpulkan poin" adalah `<ol>` langkah berurut (`page.tsx:313`), bukan grid manfaat seragam. |
| 4 | Accent rail | 1 | Absen. Tidak ada garis aksen samping; kartu antrean kasir memakai border penuh bernuansa status (`order-queue-card.tsx:15`), bukan rail. |
| 5 | Unearned blur | 1 | Absen. `backdrop-blur` hanya pada dua header sticky (`page.tsx:201`, `customer-header.tsx:4`), keduanya memang butuh konten menembus di belakang. |
| 6 | Stat monument | 1 | Absen. Angka "12" berada di dalam artefak saldo poin (`page.tsx:149`); `MetricCard` menampilkan metrik nyata berlabel + deskripsi (`metric-card.tsx:33`), bukan klaster angka dekoratif. |
| 7 | Icon topper | 1 | Absen. Tidak ada ikon kotak-membulat di atas setiap judul seksi; ikon duduk sebaris dengan label (`metric-card.tsx:27`) atau di dalam artefak domain. |
| 8 | Bounce everywhere | 1 | Absen. Nol elastic/bounce; motion hanya `transform`/`opacity` dan dibungkus `motion-safe:`/`motion-reduce:` (mis. `shop-fab.tsx:34`, `page.tsx:291`). |
| 9 | Default type | 0 | **Terdeteksi.** Bukan pada keluarga huruf (Baloo 2 + Plus Jakarta Sans ditetapkan design.md §5), melainkan pada **nilai default generator** yang tertinggal di primitive bersama: `card.tsx:14` (`rounded-xl ring-1 ring-foreground/10`), `button.tsx:8` (`h-8`), `input.tsx:10` (`h-8`), `textarea.tsx:9` (`rounded-lg`), plus scaffolding `dark:` yang tidak terpakai. |
| 10 | Center stack | 1 | Absen. Hero dua kolom asimetris (`page.tsx:248`); yang terpusat hanya form auth (`(auth)/layout.tsx:8`) dan empty state — keduanya konvensi yang sah. |

> Skor akhir mengikuti skala terbalik berdasarkan jumlah *tell* (1 tell → 8/10), bukan jumlah baris.

---

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | MEDIUM | Surface | `src/components/ui/card.tsx:14`, `src/components/ui/button.tsx:7-28`, `src/components/ui/input.tsx:10`, `src/components/ui/textarea.tsx:9`, `src/app/globals.css:5`, `src/app/globals.css:50-62` | Primitive shadcn dibiarkan default: `Card` = `rounded-xl ring-1 ring-foreground/10 bg-card` (radius `--radius-xl` 1.75rem, tanpa `warm-border`, tanpa `shadow-card`); `Button` ukuran dasar `h-8`; `Input` `h-8`; `Textarea` `rounded-lg`; seluruhnya membawa varian `dark:` dan `globals.css` mendeklarasikan `@custom-variant dark`, `--color-sidebar-*`, `--color-chart-*` | Sesuaikan primitive ke design.md §8: `Card` → `rounded-card border border-warm-border bg-card shadow-card`, `Button` tinggi 48 dasar / 56 kasir, `Input`/`Textarea` `h-12` `rounded-button bg-card`; hapus varian `dark:*`, `@custom-variant dark`, dan token `sidebar`/`chart` yang tidak dipakai | Satu root cause, enam lokasi: hasil generator tidak pernah disesuaikan padahal design.md §4 mewajibkannya. Setiap pemanggil menambal manual (`(auth)/masuk/page.tsx:24` menempel `shadow-card`; `auth/text-field.tsx:56` menempel `h-12 bg-card`), sehingga spec kartu dan kontrol hidup di dua tempat. Efek terlihat: radius sudut dan garis tepi kartu di 6 layar auth dan 4 kartu admin/analitik berbeda dari token kartu yang dipakai di seluruh sisa aplikasi |

---

## Suspicions (belum terkonfirmasi)

| Location | Suspicion | Mengapa bukan tell |
|---|---|---|
| `design.md:53-56` | Palet hangat oranye/kuning/cokelat adalah jawaban pertama untuk kategori makanan ("a food app as warm orange") | Nilai warna diambil apa adanya dari sumber kebenaran desain brand; keputusan sengaja, bukan drift. Perbaikannya arah seni (`/design voice`), bukan mengganti token |
| `globals.css:83-86` | Plus Jakarta Sans adalah pasangan default yang sangat umum; bisa terbaca "tanpa suara" | Keluarga ditetapkan design.md §5 dengan alasan; Baloo 2 membawa suara brand pada seluruh judul dan angka besar |
| `page.tsx:231-246`, `page.tsx:388-401` | Motif cincin donat dekoratif diulang di hero dan CTA penutup | Dua kemunculan dengan peran sama-sama dekoratif bisa jadi pengulangan; dinilai masih ritme brand, `aria-hidden`, dan tidak menutupi konten (design.md §12) |

---

## Considered but Rejected

| Location | Kandidat | Ditolak karena |
|---|---|---|
| `src/app/(public)/page.tsx:313` | Tiga item seragam pada "Cara mengumpulkan poin" dibaca sebagai feature tile grid | Wadahnya `<ol>` langkah berurut; keseragaman justru membawa makna urutan, bukan daftar manfaat tanpa prioritas |
| `src/app/admin/page.tsx:55` | Grid tiga `MetricCard` seragam dibaca sebagai feature tile grid | Ini baris metrik pada surface *Monitor*: setiap kartu berlabel + berdeskripsi, bobot yang sama membantu pembandingan cepat, bukan menggantikan cerita produk |
| `src/components/admin/metric-card.tsx:33` | Angka `text-3xl` dibaca sebagai stat monument | Metrik operasional nyata dengan label dan deskripsi penjelas; ukuran besar adalah fungsi pemindaian, bukan hiasan penutup ruang |
| `src/components/customer/customer-bottom-nav.tsx:40` | Label navigasi `text-xs` berpotensi terlalu kecil | Design.md §10 menetapkan maksimal 4 item dengan ikon + label pada target ≥ 48px (`min-h-14`); memaksa label membesar akan menabrak batas lebar 375px |
| `src/app/(auth)/layout.tsx:8` | Form auth terpusat dibaca sebagai center stack | Form masuk/daftar memang artefak tunggal berfokus; simetri di sini konvensi yang sah, komposisi halaman lain tetap asimetris |

---

## Verification

**Diperiksa (source):**
- Membaca dengan nomor baris: `page.tsx`, `globals.css`, `ui/{card,button,input,textarea,label}.tsx`, `customer/{order-card,shop-fab,shop-menu-card,cart-view,menu-detail-view,order-status-badge,voucher-card,account-qr-card,reward-card,customer-header,customer-bottom-nav}.tsx`, `kasir/{order-queue-card,inject-points-dialog,code-scanner}.tsx`, `admin/{metric-card,loyal-customers-card,admin-nav,reward-form}.tsx`, `(customer)/{dashboard,promo,belanja}/page.tsx`, `(auth)/{layout,masuk/page}.tsx`, `(customer)/layout.tsx`.
- Grep hue AI (`indigo|violet|purple|blue-|cyan|teal-|emerald|from-.*to-|bg-gradient`) pada `src/` → **0 hasil** (odor 1 & 2 absen).
- Grep tema gelap (`next-themes|setTheme|classList.add("dark")|"dark"`) pada `**/*.{ts,tsx,css,json,mjs}` → hanya `Wordmark tone="dark"` di `page.tsx:88-100` yang tidak berkaitan; **tidak ada mekanisme tema gelap** → varian `dark:` dan token `sidebar`/`chart` terkonfirmasi mati.
- Grep `placeholder=` (19 pemanggilan) → seluruhnya teks contoh/petunjuk ("Contoh: ...", "Ketik username..."), tidak ada yang menggantikan label; label nyata lewat `<Label htmlFor>`.
- Grep seluruh `<Button>` → setiap pemanggil menetapkan tinggi eksplisit (`h-10`/`h-11`/`h-12`/`h-14`/`size-*`), sehingga `h-8` default tidak terjangkau secara visual (tell laten, bukan tampak).

**Tidak diverifikasi (verification gap, bukan temuan):**
- Reflow 320px dan zoom 200% — tidak ada peramban aktif di sesi ini.
- Pengukuran rasio kontras alat — estimasi dari token design.md §3.4, bukan pengukuran mesin.
- Visibilitas nyata cincin fokus pada tautan teks polos (mis. `page.tsx:422`, `menu-detail-view.tsx:102`) — mengandalkan outline peramban, belum dilihat visual.
- Render runtime kartu auth/admin (`rounded-xl` vs `rounded-card`, `ring-foreground/10` vs `warm-border`) — disimpulkan dari source dan pemetaan token, belum dikonfirmasi pada peramban.

---

## Verdict

**FAINT** (skor smell 8/10) · **Needs changes**

Tidak ada temuan `HIGH`. Satu temuan `MEDIUM` terbuka (primitive generator yang belum
disesuaikan ke design.md §8 beserta scaffolding tema gelap yang mati). Catatan verifikasi visual
(320px, zoom, kontras, fokus) tetap terbuka dan tercatat sebagai gap, bukan temuan. Mode ini tidak
mengubah kode dan hanya membuat dua artefak laporan.
