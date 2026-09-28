# Smell Report — Donjun Donat Loyalty

**Surface:** Landing page `/` — `src/app/(public)/page.tsx`
**Mode:** `/design smell`
**Tanggal:** 2026-09-28
**Register:** Brand (design.md §2)

---

## Overall

**Score: 10 / 10 — CLEAN**

Tidak ada *tell* yang terkonfirmasi pada sepuluh odor yang dilacak. Halaman punya keputusan
yang tidak bisa ditebak dari kategori produknya saja: hero asimetris dengan bukti berupa
artefak domain (kartu voucher + barcode + saldo poin), section manfaat dengan hierarki
dominan + daftar sekunder, dan gerak yang dibungkus `motion-safe:`.

**TL;DR.** Audit ulang setelah `/design relayout`. Temuan `MEDIUM` sebelumnya — grid manfaat
yang seragam — sudah tidak ada: section "Kenapa bergabung" kini punya satu manfaat dominan
(`size-14`, judul `text-2xl/3xl`) dan tiga manfaat sekunder sebagai daftar berdivider. Tidak
ada *tell* baru yang muncul dari perubahan itu.

**Rekomendasi utama.** Tidak ada aksi wajib. Bila ingin mendorong lebih jauh dari jawaban
pertama kategori makanan (hangat oranye), jalankan `/design voice` untuk menambah arahan seni
yang lebih khusus. Verifikasi visual 320px/zoom tetap perlu peramban (lihat bagian Verifikasi).

---

## Heuristic Scores

| # | Heuristik | Nilai | Temuan kunci |
|---|---|---|---|
| 1 | Tech gradient | 1 | Tidak ada. Glow hero memakai `brand-yellow` + `sky-pastel`, bukan biru-ungu/indigo-cyan (`page.tsx:227`). |
| 2 | Generic tech hue | 1 | Tidak ada. Identitas hangat oranye/kuning/cokelat dari palet brand. |
| 3 | Feature tile grid | 1 | **Sudah bersih.** Section manfaat kini broken grid: satu item dominan + daftar sekunder berdivider, bukan 2×2 seragam (`page.tsx:338`). |
| 4 | Accent rail | 1 | Tidak ada garis aksen samping pada kartu/callout. |
| 5 | Unearned blur | 1 | `backdrop-blur` hanya pada header sticky; fungsional dan konsisten dengan `customer-header`. |
| 6 | Stat monument | 1 | Angka "12" berada di dalam artefak saldo poin, bukan klaster angka dekoratif. |
| 7 | Icon topper | 1 | Ikon tidak diletakkan di atas setiap judul section; ikon duduk di samping/di dalam item. |
| 8 | Bounce everywhere | 1 | Tidak ada. Satu entrance fade+slide, dibungkus `motion-safe:`. |
| 9 | Default type | 1 | Tidak ada. Plus Jakarta Sans + Baloo 2 ditetapkan design.md §5; Baloo 2 membawa suara brand. |
| 10 | Center stack | 1 | Tidak ada. Hero dua kolom asimetris; hanya CTA penutup yang terpusat (konvensional). |

> Skor akhir mengikuti skala terbalik berdasarkan jumlah *tell* (0 tell → 10/10), bukan jumlah baris.

---

## Findings

**Tidak ada temuan pada pass ini.** Tidak ada *tell* yang memenuhi ambang bukti (pola terlihat,
reflex di baliknya, alasan melemahkan brief, dan mode perbaikan). Daftar temuan kosong adalah
hasil yang sah.

**Kontinuitas.** Temuan `MEDIUM` dari laporan sebelumnya (Feature tile grid pada
`page.tsx:334`) sudah diperbaiki melalui `/design relayout` dan dinilai ulang sebagai *absent*.

---

## Suspicions (belum terkonfirmasi)

| Location | Suspicion | Mengapa bukan tell |
|---|---|---|
| `design.md` §3 | Palet hangat oranye adalah jawaban pertama untuk kategori makanan ("food app as warm orange") | Nilai warna diambil apa adanya dari sumber kebenaran desain brand; keputusan sengaja, bukan drift. Perbaikannya arah seni (`/design voice`), bukan mengganti token. |
| `page.tsx:200` | Header `backdrop-blur` mendekati "unearned blur" | Bar sticky memang butuh konten menembus di belakangnya, dan sudah menjadi pola di area pelanggan. |
| `page.tsx:230`, `page.tsx:390` | Motif cincin donat dekoratif diulang di hero dan CTA penutup | Dua kemunculan dengan peran sama-sama dekoratif bisa jadi pengulangan; dinilai masih sebagai ritme brand, bukan wallpaper bertumpuk. Dicatat sebagai suspicion. |

---

## Considered but Rejected

| Location | Kandidat | Ditolak karena |
|---|---|---|
| `page.tsx:354` | Ganti divider `divide-y` dengan jarak saja | Wadahnya satu kartu putih; garis redup membantu daftar terbaca sebagai satu unit. layout.md mengizinkan garis tipis di batas grup. |
| `page.tsx:146` | Kecilkan angka "12" | Nilai bermakna di dalam artefak saldo poin, bukan monumen statistik dekoratif. |
| `page.tsx:390` | Ratakan kiri CTA penutup | Satu blok terpusat sebagai penutup adalah konvensi sah; komposisi halaman tetap asimetris. |
| `page.tsx:95` | Ganti Plus Jakarta Sans | Jenis huruf ditetapkan design.md §5; pairing dengan Baloo 2 disengaja, bukan tanpa alasan. |
| `page.tsx:230` | Hapus SVG cincin donat dekoratif | Sesuai design.md §12 (ilustrasi artisanal area pelanggan), `aria-hidden`, tidak menutupi konten. |

---

## Verification

**Diperiksa (source):**
- Baca ulang `src/app/(public)/page.tsx` dengan nomor baris; temuan dan sinyal positif dipetakan ke baris spesifik.
- Konfirmasi section manfaat kini `lg:grid-cols-[1.1fr_1fr]` dengan satu item dominan dan `<dl>` berdivider (`page.tsx:338`, `:354`).
- Render produksi `/` (HTTP 200) pada pass sebelumnya: DOM memuat heading `h3 "Voucher tanpa kedaluwarsa"` + 3 item sekunder, dan CSS memuat `grid-template-columns:1.1fr 1fr`, `divide-warm-border`, `first:pt-0`/`last:pb-0`.

**Tidak diverifikasi (verification gap, bukan temuan):**
- Reflow 320px dan zoom 200% — tidak ada peramban di sesi ini (`agent-browser` belum terpasang).
- Cincin fokus pada tautan teks polos (`page.tsx:202`, `:402`, `:422`) — mengandalkan outline bawaan peramban; belum dilihat visual.
- Rasio kontras terukur — estimasi dari token design.md §3.4, bukan pengukuran alat.

---

## Verdict

**CLEAN** (skor smell 10/10) · **Approve** (status temuan)

Tidak ada temuan `HIGH`, `MEDIUM`, maupun `LOW` yang terbuka. Tidak ada aksi wajib. Catatan
verifikasi visual (320px, zoom, fokus, kontras) tetap terbuka dan tercatat sebagai gap, bukan
temuan. Mode ini tidak mengubah kode dan hanya membuat dua artefak laporan.
