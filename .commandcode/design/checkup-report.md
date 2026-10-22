# Checkup Report: Donjun Donat Loyalty

**Surface:** Seluruh antarmuka: `(public)`, `(auth)`, `(customer)`, `kasir`, `admin`
**Mode:** `/design checkup`
**Tanggal:** 2026-10-15
**Register:** Brand (pelanggan) + Product (kasir & admin), design.md §2
**Pratinjau alur inti:** daftar → QR akun → injeksi poin → tukar poin → validasi voucher → belanja → keranjang → bukti transfer → konfirmasi kasir

---

## Overall

**Score: 40 / 60** · **Status: PROCEED WITH FIXES** (tidak ada vital `Critical`)

Permukaan ini sehat pada hal-hal yang paling sering rusak: setiap status membawa warna + ikon + label,
tidak ada placeholder yang menggantikan label, semua input memakai 16px pada layar kecil sehingga tidak
memicu zoom iOS, area aman perangkat dihormati, dan setiap rute pemuatan data punya skeleton. Tiga
vital masuk `Watch`: komponen bersama yang belum disesuaikan dari generator, dua tombol submit yang mati
selama input belum valid, dan ukuran target sentuh di keranjang. Tidak ada satu pun yang memblokir
tugas, jadi lanjut ke perbaikan.

**Preskripsi langsung:**

1. **Usability (Watch).** Tombol submit mati selama input belum valid di `components/customer/upload-proof-form.tsx:132` dan `components/kasir/validate-voucher-panel.tsx:121`, sehingga jalur galat yang sudah ditulis di kode tidak terjangkau. Perbaiki dengan `/design a11y`: aktifkan tombol, validasi saat submit, tampilkan galat inline.
2. **Accessibility (Watch).** Tombol jumlah dan hapus di keranjang berukuran 36px (`components/customer/cart-view.tsx:317,333,343`), di bawah lantai 44px design.md §8 dan §11.2. Naikkan ke 44px seperti kontrol setara di `menu-detail-view.tsx:230`.
3. **Intentionality (Watch).** Empat dari lima primitive `src/components/ui/*` masih default generator; `Card` merender radius dan garis tepi default di 6 layar auth dan 4 kartu admin. Perbaiki dengan `/design tokenize`.
4. **Responsiveness (Watch).** Reflow 320px dan zoom 200% belum diverifikasi karena tidak ada peramban di sesi ini.

---

## Vital Signs

| # | Vital | Status | Nilai | Temuan kunci |
|---|---|---|---|---|
| 1 | Intentionality | Watch | 5 / 10 | Permukaan terlihat dipilih, bukan dirakit: token terdokumentasi, motion dijaga, copy spesifik. Pengecualiannya komponen bersama: `ui/card.tsx:14` masih `rounded-xl ring-1 ring-foreground/10` (tanpa `warm-border`, tanpa `shadow-card`), `ui/button.tsx:8` `h-8`, `ui/input.tsx:10` `h-8`, `ui/textarea.tsx:9` `rounded-lg`, seluruhnya dengan scaffolding `dark:` yang tidak punya tema gelap (`globals.css:5,50`). Setiap pemanggil menambal manual, mis. `(auth)/masuk/page.tsx:24` menempel `shadow-card`. |
| 2 | Readability | Healthy | 10 / 10 | Isi 1rem, pasangan kontras AA terukur dan terdokumentasi (design.md §3.4), angka `tabular-nums`, tidak ada teks di atas latar yang gagal kontras menurut tabel tersebut. Catatan: langkah caption dirender 12px (`text-xs`) sedangkan token design.md §5 menetapkan 13px; masih terbaca, dilaporkan sebagai temuan Type di `review-report.md`. |
| 3 | Usability | Watch | 5 / 10 | Tugas inti selesai di semua alur. Cacatnya: dua tombol submit mati selama input belum valid (`upload-proof-form.tsx:132`, `validate-voucher-panel.tsx:121`), dan keduanya mematikan jalur galat yang sudah ditulis (`upload-proof-form.tsx:59`, `validate-voucher-panel.tsx:101`). Temuan `HIGH` yang sama dari `review-report.md`. |
| 4 | Responsiveness | Watch | 5 / 10 | Yang terverifikasi baik: seluruh `input`/`select`/`textarea` memakai 16px pada layar < 640px (`ui/input.tsx:10` `text-base md:text-sm`, `ui/textarea.tsx:9`, `reward-form.tsx:41`), sehingga tidak memicu zoom otomatis iOS; `viewportFit: "cover"` dan `env(safe-area-inset-*)` dipakai di nav bawah, header, dan dialog (`layout.tsx:74`, `customer-bottom-nav.tsx:26`, `account-qr-card.tsx:97`); komposisi berubah di 768px dan 1024px. Yang belum: reflow 320px dan zoom 200%. |
| 5 | Speed | Healthy | 10 / 10 | Fondasi terlihat benar: `next/font` self-hosted tanpa layout shift (`layout.tsx:7,12`), skeleton untuk setiap rute pemuatan (15 `loading.tsx`), `Image` dengan `sizes` dan `priority` pada hero detail menu, Cloudinary `f_auto,q_auto`. Tidak ada pengukuran Lighthouse di sesi ini, dicatat sebagai gap. |
| 6 | Accessibility | Watch | 5 / 10 | Yang terverifikasi baik: warna tidak pernah sendiri (ikon + label di setiap status), `focus-visible` selalu ada saat `outline-none` dipakai, dialog memakai `<dialog>` native dengan fokus ke aksi paling tidak berbahaya, `motion-reduce:` dijaga, `role="alert"`/`aria-live` untuk galat dan proses, skip link di area pelanggan dan kasir. Yang lemah: target sentuh keranjang 36px (`cart-view.tsx:317,333,343`) di bawah lantai 44px, dan langkah keyboard belum ditelusuri di peramban. |
| | **Total** | | **40 / 60** | |

---

## Prescriptions

| # | Vital | Severity | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | Usability / Accessibility | HIGH | `components/customer/upload-proof-form.tsx:132`, `components/kasir/validate-voucher-panel.tsx:121` | Submit mati selama input belum valid: `disabled={isSubmitting \|\| !file}`, `disabled={result.kind === "loading" \|\| code.trim().length === 0}` | Aktifkan tombol; validasi saat submit dan tampilkan galat inline yang sudah tersedia | design.md §8 melarangnya, dan jalur galat di kode menjadi mati (`upload-proof-form.tsx:59`, `validate-voucher-panel.tsx:101`). Jalankan `/design a11y` |
| 2 | Accessibility | MEDIUM | `components/customer/cart-view.tsx:317,333,343` | Tombol jumlah `size-9` (36px) dan tombol hapus `h-9` (36px) | Naikkan ke `size-11` / `h-11` (44px), sama seperti kontrol setara di `menu-detail-view.tsx:230` | design.md §8 dan §11.2 menetapkan target sentuh minimum 44×44px; 36px memicu salah tekan pada satu tangan di 375px |
| 3 | Intentionality | MEDIUM | `components/ui/card.tsx:14`, `ui/button.tsx:7-34`, `ui/input.tsx:10`, `ui/textarea.tsx:9`, `app/globals.css:5,50-62` | Primitive default generator (radius `rounded-xl`, ring `foreground/10`, tinggi `h-8`) + scaffolding `dark:` tanpa tema gelap | Sesuaikan ke design.md §8 dan hapus scaffolding mati | Temuan `MEDIUM` yang sama dari `smell-report.md`. Jalankan `/design tokenize` |

---

## Verification

**Diperiksa (source).**
- Membaca dengan nomor baris: `layout.tsx`, `globals.css`, `ui/{card,button,input,textarea,label}.tsx`, `(public)/page.tsx`, `(auth)/layout.tsx`, `(customer)/{layout,dashboard}/page.tsx`, `components/customer/{account-qr-card,cart-view,menu-detail-view,upload-proof-form,order-card,payment-deadline,shop-fab,customer-bottom-nav}.tsx`, `components/kasir/{validate-voucher-panel,scan-panel,inject-points-dialog,code-scanner,order-queue-card,order-decision-actions,kasir-nav}.tsx`, `kasir/{layout,riwayat/page}.tsx`, `admin/{page,audit/page}.tsx`, `components/admin/{metric-card,reward-form}.tsx`.
- Ukuran font input pada layar kecil: `text-base md:text-sm` terverifikasi pada `ui/input.tsx:10`, `ui/textarea.tsx:9`, dan `reward-form.tsx:41` → 16px di bawah 640px, sesuai syarat anti-zoom iOS.
- Target sentuh: `size-9`/`h-9` (36px) terverifikasi di `cart-view.tsx:317,333,343`; `size-11` (44px) di `menu-detail-view.tsx:230`; `h-12`/`h-14` pada tombol submit dan aksi kasir.
- Escalation trigger dari `severity.md`: tidak ditemukan. Tidak ada makna yang hanya dibawa warna, tidak ada placeholder yang menggantikan label, tidak ada motion yang mengabaikan `prefers-reduced-motion`, tidak ada jalur mouse yang tidak dapat dilalui keyboard pada kode.
- `@variant dark` di `node_modules/shadcn/dist/tailwind.css:576` hanya butuh varian `dark` bawaan Tailwind, bukan override kelas `.dark`.

**Tidak diverifikasi (gap, bukan temuan).**
- Reflow 320px dan zoom 200%.
- Langkah keyboard dan pengumuman pembaca layar pada alur injeksi, validasi voucher, dan checkout.
- Kontras terukur dengan alat; penilaian Readability memakai tabel design.md §3.4.
- Lighthouse dan skor performa nyata.
- Tampilan terender sebagai gambar; semua status di atas berasal dari kode.

---

## Verdict

**PROCEED WITH FIXES** · 40 / 60, tanpa vital `Critical`

Tidak ada yang memblokir rilis pada tingkat vital. Empat `Watch` sudah punya preskripsi konkret di atas,
dan ketiganya (submit yang mati, target sentuh keranjang, primitive generator) adalah perbaikan kecil
berdampak besar. Laporan ini tidak mengubah kode; ia melengkapi `smell-report.md` dan `review-report.md`.
