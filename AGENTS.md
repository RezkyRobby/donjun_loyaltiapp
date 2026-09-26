# AGENTS.md — Platform Loyalitas Donjun Donat

Panduan kerja untuk agen AI dan developer yang membangun serta memodifikasi proyek ini. Sumber kebenaran kebutuhan: **`PRD.md`**. Baca dokumen ini sampai selesai sebelum menulis kode.

## Bahasa

Seluruh komunikasi, komentar kode, pesan commit, teks UI, konten email, dan label status ditulis dalam **Bahasa Indonesia formal**. Nama variabel, fungsi, komponen, dan tipe tetap bahasa Inggris.

## Sumber Kebenaran & Urutan Baca

1. **`PRD.md`** — spesifikasi fitur, alur bisnis (§8), skema database (§7), NFR (§9), peta route (Lampiran B), dan environment variables (Lampiran C).
2. **`PRD.md` §15 Glossary** — istilah domain wajib dipakai persis: **Voucher** (bukan kupon), **Injeksi Poin**, **Voucher single-use**, **Outlet**, **WITA**. Istilah yang salah menyesatkan pembaca kode berikutnya.
3. **`design.md`** — sumber kebenaran desain visual (v1.0 — tersedia). Wajib dipatuhi untuk halaman pelanggan; halaman kasir dan admin mengikuti register *product* (design.md §2).
4. **`.env.example`** — daftar environment variable (ringkasan: PRD Lampiran C).
5. **`AGENTS.md`** (file ini) — aturan main pengerjaan.

Jika ada pertentangan, **PRD yang menang**. Kebutuhan di luar PRD wajib memperbarui PRD terlebih dahulu — jangan menambah scope diam-diam.

## Tech Stack (Wajib)

Next.js 16 App Router · React 19 · Tailwind CSS 4 · shadcn/ui · PostgreSQL · Prisma 7 · Better-Auth (email + kata sandi, Google OAuth, plugin username) · Gmail SMTP (Nodemailer) · Cloudinary · `react-barcode` + `qrcode.react` · `html5-qrcode` · `date-fns-tz` (WITA) · Zod · Sentry · Vercel.

Jangan menambah library baru tanpa justifikasi — PRD sudah memilih stack ini. Versi persis mengikuti `package.json`. Runtime wajib **Node.js ≥ 22.12** (syarat Prisma 7).

## Aturan Non-Negotiable

Pelanggaran aturan ini adalah **bug meskipun fiturnya berjalan**:

1. **Validasi dua lapis dengan Zod** — satu skema dipakai di klien (UX) dan wajib divalidasi ulang di Server Action / Route Handler (keamanan). Jangan pernah mempercayai validasi klien.
2. **Akses database hanya via Prisma Client.** `$queryRawUnsafe` dan `$executeRawUnsafe` dilarang; query mentah hanya bentuk *tagged template* berparameter (`$queryRaw`/`$executeRaw`). Nilai filter/sort dinamis hanya dari daftar putih (*whitelist*); wildcard pencarian (`%`, `_`) di-escape.
3. **Semua mutasi multi-tabel dan mutasi saldo/kuota wajib dalam `prisma.$transaction` dengan pembaruan kondisional**: voucher `WHERE status = 'ACTIVE'` (jaminan single-use atomik), saldo `pointsBalance >= pointsCost` (anti saldo negatif). Pola *check-then-update* untuk status voucher dilarang.
4. **Injeksi poin wajib melewati idempotency key + cooldown server-side** (`POINT_COOLDOWN_SECONDS`, default 60 detik per pelanggan). Tidak ada jalur pintas — termasuk untuk demo.
5. **Zona waktu `Asia/Makassar` (WITA) untuk semua logika tanggal** — batas harian/bulanan, laporan, agregasi "per jam kerja". Simpan UTC di database, konversi di kode; jangan mengasumsikan jam server.
6. **RBAC ditegakkan di middleware dan di setiap action/handler**: `/kasir/*` → `CASHIER | SUPER_ADMIN` (hanya outlet penugasan); `/admin/*` dan `/api/admin/*` → `SUPER_ADMIN`; `/api/cashier/*` → `CASHIER | SUPER_ADMIN`.
7. **Rate limit wajib aktif** sesuai NFR §9: login 5/15 menit; cek username 20/menit/IP; registrasi 5/jam/IP; email transaksional 5/akun/hari; kegagalan validasi voucher 10/menit/kasir. Pelanggaran mengembalikan 429 dengan pesan ramah.
8. **Format kode terpusat**: payload QR akun hanya `DONJUN:v1:<username>`; kode voucher hanya `DJN-` + 16 karakter dari alfabet non-ambigu (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), digenerate satu generator; tangani tabrakan unique dengan retry.
9. **AuditLog wajib tercatat** untuk aksi yang dispesifikasikan PRD: koreksi poin (`ADJUST`, dengan `note` wajib), perubahan reward/staf/outlet, pembatalan voucher, revert `USED`, suspend pelanggan.
10. **Aturan akun**: satu email untuk satu akun; akun kasir hanya dibuat via UI admin (bukan seed); `SUPER_ADMIN` hanya via seeder; data pelanggan yang tampil ke kasir hanya nama & username.

## Keputusan Bisnis yang Mudah Tertukar

Ini kesalahan implementasi yang paling mungkin terjadi — pegang spesifikasinya:

| Topik | Keputusan |
|---|---|
| Identitas akun | `username` dan email **permanen** (tidak dapat diubah). Hanya nama, nomor telepon, dan kata sandi yang dapat diubah. |
| Skala poin | Poin & voucher **global lintas outlet**; filter outlet hanya untuk pelaporan. Setiap injeksi/redemption tetap merekam `outletId`. |
| Pembatalan voucher | Voucher yang sudah ditukar **tidak dapat dibatalkan pelanggan**. Hanya Super Admin (alasan wajib) → status `CANCELED` + poin kembali sebagai `REVERSAL`. |
| Koreksi validasi | Voucher `USED` dapat dikembalikan ke `ACTIVE` oleh Super Admin **maksimal 1x24 jam**, alasan wajib. Di luar itu hanya `ADJUST` manual. |
| Lifecycle reward | Reward yang punya voucher terkait **tidak dihapus permanen** — nonaktifkan (`isActive = false`). `rewardTitle` disalin (*snapshot*) ke voucher saat penukaran. |
| Reward nonaktif | Voucher `ACTIVE` dari reward yang kemudian dinonaktifkan **tetap sah dan dapat digunakan**. |
| Suspend pelanggan | Login, injeksi baru, dan penukaran poin diblokir; voucher yang sudah dimiliki tetap dapat divalidasi kasir. |
| Kuota & limit | `quota` dihitung global (lintas outlet); `perUserLimit` per pelanggan; keduanya dicek **di dalam transaksi** penukaran. |
| Earning | "1 transaksi = 1 poin" berbasis kejujuran kasir + cooldown + idempotency + audit log — **tanpa integrasi POS**; jangan berasumsi ada nomor struk. |
| Mata uang & format | Rupiah `id-ID`; tanggal ditampilkan dalam WITA. |

## Konvensi Proyek

### Struktur Direktori

```
src/
├── app/
│   ├── (public)/        # landing, kebijakan-privasi, syarat-ketentuan
│   ├── (auth)/          # masuk, daftar, lupa-sandi, reset-sandi, verifikasi-email
│   ├── (customer)/      # dashboard, promo, voucher, pengaturan
│   ├── kasir/           # scan, validasi, riwayat
│   ├── admin/           # analitik, reward, staf, pelanggan, outlet, audit
│   └── api/             # route handler (hanya bila Server Actions tidak cocok)
├── components/          # ui/ (shadcn), shared/, komponen per fitur
├── server/              # server actions & service layer (transaksi poin/voucher)
├── lib/                 # auth, prisma client, zod, kode voucher, waktu WITA, rate limiter
├── constants/           # reserved username (Lampiran A), enum, label, pesan error
└── types/
prisma/                  # schema.prisma, migrations/, seed.ts
tests/                   # unit & integration (Vitest)
e2e/                     # E2E Playwright
```

Sesuaikan nama folder saat implementasi nyata; pertahankan pemisahan route group per role dan logika bisnis di luar komponen UI.

### Pola Wajib

- **Server Component sebagai default**; `"use client"` hanya untuk interaksi (scanner kamera, form interaktif, animasi).
- **Server Actions untuk mutasi**; route handler `/api/*` hanya bila memang tidak cocok dengan Server Actions.
- **Label status/istilah UI lewat satu kamus terpusat** di `src/constants` (mis. `ACTIVE` → "Aktif", `USED` → "Terpakai") — jangan hardcode string per komponen.
- **Error handling**: Server Action / Route Handler wajib try-catch dengan pesan Bahasa Indonesia; toast (`sonner`) untuk operasi CRUD; loading skeleton dan empty state untuk semua data fetching.
- **Pagination server-side** (default 50 baris/halaman) untuk semua daftar; filter dan ekspor CSV untuk audit log.
- **Tanggal & angka** diformat lewat util terpusat (`date-fns-tz` + locale `id-ID`), bukan formatting ad-hoc.

### Environment Variables

Daftar lengkap di **PRD Lampiran C** dan `.env.example`. Setiap variabel baru wajib didokumentasikan di `.env.example` dengan placeholder — tanpa nilai asli. Secret tidak boleh masuk repositori maupun kode klien.

## Definition of Done per Fitur

Fitur dianggap selesai bila semua cek lolos:

1. Mengikuti blueprint skema PRD §7; perubahan skema butuh alasan eksplisit dan dicatat pada riwayat revisi PRD.
2. Semua mutasi multi-tabel berjalan dalam `prisma.$transaction` dengan pembaruan kondisional.
3. Injeksi poin teruji: idempotency key, cooldown, dan audit `PointTransaction` (`cashierId`, `outletId`, `method`).
4. Validasi Zod aktif di klien dan server untuk setiap input yang menyentuh database.
5. RBAC teruji: rute antar-role menolak akses yang salah; kasir hanya melihat nama & username pelanggan.
6. Rate limit terpasang untuk endpoint terkait (login, cek username, registrasi, email, scan voucher).
7. Unit test untuk logika deterministik (validasi username + reserved words, generator kode voucher, logika poin); integration test untuk transaksi atomik & race condition; E2E untuk alur yang terdampak.
8. Label enum lewat kamus terpusat; seluruh teks UI Bahasa Indonesia.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, dan `pnpm build` hijau.
10. Perubahan UI diuji pada viewport 375px (mobile-first) dan tidak menurunkan skor Lighthouse.

## Aturan Kerja Per Run

- Satu run mengerjakan **satu task** dari daftar Urutan Pengerjaan. Selesaikan sampai lolos verifikasi dan ter-commit, lalu berhenti, laporkan, dan tunggu run berikutnya.
- Sebelum mulai: baca ulang `PRD.md` pada fase terkait dan cek struktur repo aktual agar tidak bekerja dari asumsi usang.
- Task selesai ditandai dengan mengubah `[ ]` menjadi `[x]` pada daftar Urutan Pengerjaan.
- Urutan dalam fase tidak boleh dilompati: skema → migrasi → seed/konstanta → server logic → UI → test.
- Fase berikutnya baru dikerjakan setelah fase sebelumnya tuntas.

### Verifikasi Sebelum Commit

Jalankan berurutan, semua harus lolos:

1. `pnpm typecheck` — tanpa error tipe.
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build` — boleh dilewati hanya untuk task parsial yang memang belum bisa di-build.

Task gagal berarti **tidak di-commit**: laporkan error dan langkah yang sudah dicoba, lalu tunggu arahan.

### Format Commit

Pesan Bahasa Indonesia imperatif dengan prefix:

| Tipe | Prefix | Contoh |
|---|---|---|
| Setup/tooling | `chore:` | `chore: inisialisasi Next.js 16, Tailwind CSS 4, dan shadcn/ui` |
| Skema/migrasi | `feat(db):` | `feat(db): tambah model Voucher dan PointTransaction sesuai PRD §7` |
| Autentikasi | `feat(auth):` | `feat(auth): integrasi Google OAuth dan verifikasi email` |
| Portal pelanggan | `feat(customer):` | `feat(customer): buat dompet voucher dengan barcode Code 128` |
| Portal kasir | `feat(kasir):` | `feat(kasir): injeksi poin dengan idempotency dan cooldown` |
| Dashboard admin | `feat(admin):` | `feat(admin): audit log dengan filter dan ekspor CSV` |
| API/actions | `feat(api):` | `feat(api): endpoint rate-limit cek ketersediaan username` |
| Testing | `test:` | `test: integration validasi voucher single-use di bawah konkurensi` |
| Deploy | `deploy:` | `deploy: konfigurasi environment produksi Vercel` |

`git add -A` dan `git commit -m "..."` dieksekusi sebagai dua perintah terpisah, tanpa `&&`.

### Laporan Akhir Run

Setelah commit berhasil (konfirmasi via `git log -1 --oneline`):

```
OK Task X selesai — [nama task]
- Commit: [hash]
- Verifikasi: Typecheck OK | Lint OK | Test OK | Build OK/SKIP
- File diubah: [daftar file]
- Task selanjutnya: [task Y]
```

Bila gagal, jangan commit:

```
X Task X gagal — [nama task]
- Error: [detail error]
- Sudah dicoba: [langkah yang sudah ditempuh]
```

## Urutan Pengerjaan (Fase PRD §12)

Progress tracker lintas sesi: ubah `[ ]` menjadi `[x]` setiap task selesai.

### Fase 1 — Fondasi & Basis Data (Hari 1–5)

- [x] 1. Inisialisasi Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS 4 + ESLint + shadcn/ui sesuai Struktur Direktori
- [x] 2. Setup PostgreSQL + Prisma 7 + `.env.example` lengkap (PRD Lampiran C)
- [ ] 3. Skema Prisma lengkap PRD §7 (User, Outlet, RewardCatalog, Voucher, PointTransaction, AuditLog + seluruh enum)
- [ ] 4. Migrasi awal + seed dasar (Super Admin via API Better-Auth, outlet contoh, katalog reward dummy)
- [ ] 5. Better-Auth: email + kata sandi, Google OAuth, plugin username, verifikasi email, reset kata sandi, 3 role
- [ ] 6. Middleware proteksi route per role (PRD Lampiran B) + rate limiter login
- [ ] 7. Integrasi Gmail SMTP (verifikasi, reset, undangan staf) dengan batas 5 email/akun/hari
- [ ] 8. Utilitas terpusat: skema Zod (termasuk reserved username Lampiran A), generator kode voucher `DJN-`, util waktu WITA, helper rate limit publik

### Fase 2 — Customer Portal (Hari 6–9)

- [ ] 9. Shell area pelanggan + guard role + PWA manifest & service worker (cache QR + saldo terakhir)
- [ ] 10. Registrasi email + kata sandi & Google + validasi username real-time + verifikasi email
- [ ] 11. Lupa kata sandi & reset (token 30 menit; sesi dicabut setelah ganti sandi)
- [ ] 12. Dashboard: saldo poin + QR payload `DONJUN:v1:<username>` + tampilan offline
- [ ] 13. Katalog promo: gambar, kuota tersisa, limit per pelanggan, periode, S&K, status disabled
- [ ] 14. Penukaran poin: transaksi atomik (potong saldo kondisional + kuota + voucher + `REDEEM`)
- [ ] 15. Dompet voucher: barcode Code 128 + kode alfanumerik + status ACTIVE/USED/CANCELED
- [ ] 16. Pengaturan akun (nama/telepon/sandi) + halaman S&K & Kebijakan Privasi

### Fase 3 — Cashier Portal (Hari 10–13)

- [ ] 17. Shell kasir + guard role + penugasan outlet + riwayat injeksi hari ini
- [ ] 18. Scan QR (`html5-qrcode`) dengan validasi payload versi
- [ ] 19. Input username: pencocokan prefix minimal 3 karakter, hanya nama & username yang tampil
- [ ] 20. Injeksi poin: pop-up konfirmasi + debounce + tombol disabled + idempotency key + cooldown server-side
- [ ] 21. Validasi voucher: scan barcode + input kode manual + update kondisional atomik + notifikasi hijau/merah

### Fase 4 — Voucher & Redemption (Hari 14–16)

- [ ] 22. Hardening penukaran: anti saldo negatif, kuota atomik, limit per pelanggan dicek di dalam transaksi
- [ ] 23. Pembatalan & koreksi admin (`CANCELED` → `REVERSAL`; revert `USED` ≤ 1x24 jam; `ADJUST` wajib catatan) + AuditLog
- [ ] 24. Rate limit lengkap (cek username, registrasi, kegagalan scan voucher) + respons 429 ramah
- [ ] 25. Integration test: idempotency, cooldown, race condition voucher, saldo tidak negatif

### Fase 5 — Admin, Hardening & Rilis (Hari 17–21)

- [ ] 26. Dashboard analitik (definisi metrik PRD §5.3, zona WITA, filter outlet)
- [ ] 27. Manajemen reward (CRUD + upload Cloudinary + kuota/limit/periode/S&K + nonaktifkan)
- [ ] 28. Manajemen staf (buat, undang via email, reset kredensial, pindah outlet, nonaktifkan + cabut sesi)
- [ ] 29. Manajemen pelanggan (cari, riwayat, `ADJUST` + catatan, suspend) + manajemen outlet
- [ ] 30. Audit log: filter, paginasi, ekspor CSV
- [ ] 31. E2E Playwright alur kritis (registrasi → injeksi → tukar → validasi → voucher terpakai) + test RBAC
- [ ] 32. Audit Lighthouse mobile ≥ 90 + uji kamera Android/iOS + security hardening
- [ ] 33. Deploy Vercel + verifikasi alur produksi end-to-end

## Perintah Umum

```bash
pnpm install              # pasang dependensi
pnpm dev                  # development server
pnpm typecheck            # cek tipe (wajib sebelum commit)
pnpm lint                 # eslint
pnpm test                 # unit & integration (Vitest)
pnpm test:e2e             # E2E (Playwright)
pnpm build                # production build
pnpm prisma migrate dev   # migrasi lokal
pnpm prisma db seed       # bootstrap Super Admin + data contoh
pnpm prisma studio        # inspeksi database
```

Perintah final menyesuaikan `package.json` yang benar-benar ada di repo.
