import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Plus,
  ShieldCheck,
  Smartphone,
  Store,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kumpulkan poin, tukarkan dengan voucher donat",
  description:
    "Donjun Donat Loyalty: kumpulkan 1 poin dari setiap transaksi, lalu tukarkan dengan voucher promo. Tanpa unduh aplikasi, berlaku di semua outlet Donjun Donat.",
};

// Pratinjau voucher pada hero. Kode contoh memakai alfabet non-ambigu yang sama
// dengan generator voucher (tanpa 0/O/1/I/L) agar tampilannya jujur.
const PREVIEW_VOUCHER_CODE = "DJN-DK4MX7PQR9TWB3VH";

const HERO_POINTS = [
  "1 transaksi = 1 poin",
  "Tanpa unduh aplikasi",
  "Berlaku di semua outlet",
];

const STEPS = [
  {
    title: "Tunjukkan akun Anda",
    description:
      "Buka QR Code akun dari dasbor dan tunjukkan ke kasir, atau sebutkan username unik Anda.",
  },
  {
    title: "Kumpulkan poin",
    description:
      "Kasir menambahkan 1 poin untuk setiap transaksi. Saldo poin langsung bertambah di akun Anda.",
  },
  {
    title: "Tukar dengan voucher",
    description:
      "Pilih promo di katalog, tukarkan poin, lalu tunjukkan barcode voucher ke kasir sebelum membayar.",
  },
];

type Benefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Satu manfaat dominan menjadi titik fokus section; sisanya daftar sekunder.
// Hierarki ini mencegah section terbaca sebagai grid kotak yang seragam.
const FEATURED_BENEFIT: Benefit = {
  icon: Ticket,
  title: "Voucher tanpa kedaluwarsa",
  description:
    "Voucher tetap berlaku sampai dipakai. Tidak ada batas waktu untuk menukarkannya.",
};

const SECONDARY_BENEFITS: Benefit[] = [
  {
    icon: Smartphone,
    title: "Tanpa unduh aplikasi",
    description:
      "Cukup buka dari peramban ponsel Anda. Tidak ada aplikasi yang perlu dipasang.",
  },
  {
    icon: Store,
    title: "Poin lintas outlet",
    description:
      "Kumpulkan dan belanjakan poin di outlet Donjun Donat mana pun, tanpa pindah akun.",
  },
  {
    icon: ShieldCheck,
    title: "Riwayat yang transparan",
    description:
      "Setiap penambahan poin dan validasi voucher tercatat pada riwayat akun Anda.",
  },
];

function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-full bg-brand-orange font-display text-lg font-bold text-brand-brown-dark"
      >
        D
      </span>
      <span
        className={cn(
          "font-display text-lg font-bold",
          tone === "dark" ? "text-brand-yellow-light" : "text-brand-brown-dark",
        )}
      >
        Donjun Donat
      </span>
    </span>
  );
}

// Barcode ilustratif pada pratinjau voucher (design.md §9.2): batang gelap di
// atas latar putih, tinggi ≥ 80px. Bersifat dekoratif, kode teks di bawahnya
// adalah isi sebenarnya untuk input manual kasir.
function BarcodePreview({ value }: { value: string }) {
  const bars = [...value].flatMap((char, index) => {
    const seed = char.charCodeAt(0) * 7 + index * 13;

    return [
      { key: `bar-${index}`, grow: (seed % 4) + 1, filled: true },
      { key: `gap-${index}`, grow: ((seed >> 3) % 3) + 1, filled: false },
    ];
  });

  return (
    <div
      aria-hidden
      className="flex h-20 w-full items-stretch gap-px overflow-hidden rounded-lg bg-brand-white"
    >
      {bars.map((bar) => (
        <span
          key={bar.key}
          style={{ flexGrow: bar.grow }}
          className={cn(
            "basis-0",
            bar.filled ? "bg-brand-brown-dark" : "bg-brand-white",
          )}
        />
      ))}
    </div>
  );
}

function HeroArtifact() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-card border border-warm-border bg-brand-white p-4 shadow-card">
        <div>
          <p className="text-[0.8125rem] font-medium text-brand-brown-muted">
            Saldo poin
          </p>
          <p className="font-display text-[2.5rem] font-bold leading-none tabular-nums text-brand-brown-dark">
            12
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-badge border border-donut-matcha/40 bg-donut-matcha/10 px-3 py-1 text-[0.8125rem] font-medium text-donut-matcha-deep">
          <Plus aria-hidden className="size-3.5" />
          Poin masuk
        </span>
      </div>

      <article className="flex flex-col gap-4 rounded-card border border-warm-border bg-brand-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.8125rem] font-medium text-brand-brown-muted">
              Contoh voucher
            </p>
            <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
              Gratis 1 Donat Glaze
            </h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-badge border border-donut-matcha/40 bg-donut-matcha/10 px-3 py-1 text-[0.8125rem] font-medium text-donut-matcha-deep">
            <BadgeCheck aria-hidden className="size-4" />
            Aktif
          </span>
        </div>

        <BarcodePreview value={PREVIEW_VOUCHER_CODE} />

        <p className="text-center text-lg font-bold uppercase tracking-[0.08em] tabular-nums text-brand-brown-dark">
          {PREVIEW_VOUCHER_CODE}
        </p>
        <p className="text-center text-sm text-brand-brown-muted">
          Tunjukkan kepada kasir sebelum membayar.
        </p>
      </article>
    </div>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();
  const FeaturedIcon = FEATURED_BENEFIT.icon;

  return (
    <>
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-button focus:bg-brand-brown-dark focus:px-4 focus:py-2 focus:text-brand-yellow-light"
      >
        Lompat ke konten utama
      </a>

      <header className="sticky top-0 z-30 border-b border-warm-border/70 bg-brand-yellow-light/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-button">
            <Wordmark />
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-11 px-4 text-brand-brown-dark"
            >
              <Link href="/masuk">Masuk</Link>
            </Button>
            <Button asChild className="h-11 rounded-button px-5 font-semibold">
              <Link href="/daftar">Daftar</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="konten-utama">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(58% 55% at 12% 0%, var(--brand-yellow) 0%, transparent 68%), radial-gradient(45% 50% at 100% 8%, var(--sky-pastel) 0%, transparent 62%)",
            }}
          />
          <svg
            aria-hidden
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -top-24 -right-20 size-72 text-brand-yellow/70 lg:size-96"
          >
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="26"
            />
            <circle cx="168" cy="150" r="6" fill="var(--donut-berry)" />
            <circle cx="40" cy="44" r="5" fill="var(--donut-matcha)" />
          </svg>

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
            <div className="flex flex-col items-start gap-6 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
              <span className="inline-flex items-center gap-2 rounded-badge border border-warm-border bg-brand-white px-3 py-1.5 text-[0.8125rem] font-medium text-brand-orange-deep shadow-card">
                <BadgeCheck aria-hidden className="size-4" />
                Program loyalitas resmi Donjun Donat
              </span>

              <h1 className="font-display text-[2.25rem]/[1.1] font-bold text-brand-brown-dark sm:text-[2.75rem]/[1.08] lg:text-[3.25rem]/[1.05]">
                Kumpulkan poin, tukarkan dengan voucher donat
              </h1>

              <p className="max-w-[60ch] text-base/relaxed text-brand-brown-muted sm:text-lg/relaxed">
                Setiap transaksi di Donjun Donat bernilai 1 poin. Kumpulkan
                poinnya, lalu tukarkan dengan voucher promo favorit Anda. Tanpa
                unduh aplikasi, cukup dari peramban ponsel.
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-12 w-full rounded-button px-6 text-base font-semibold active:scale-[0.98] sm:w-auto"
                >
                  <Link href="/daftar">Daftar sekarang</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-button border-brand-brown-muted/60 bg-brand-white px-6 text-base font-semibold text-brand-brown-dark active:scale-[0.98] sm:w-auto"
                >
                  <Link href="/masuk">Masuk</Link>
                </Button>
              </div>

              <ul className="flex flex-col gap-2 text-sm text-brand-brown-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
                {HERO_POINTS.map((point) => (
                  <li key={point} className="inline-flex items-center gap-2">
                    <Check aria-hidden className="size-4 text-donut-matcha-deep" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full motion-safe:animate-in motion-safe:delay-150 motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
              <HeroArtifact />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="cara-kerja-judul"
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16"
        >
          <div className="max-w-2xl">
            <h2
              id="cara-kerja-judul"
              className="font-display text-3xl font-bold text-brand-brown-dark sm:text-4xl"
            >
              Cara mengumpulkan poin
            </h2>
            <p className="mt-3 text-brand-brown-muted">
              Tiga langkah sederhana, berlaku di semua outlet Donjun Donat.
            </p>
          </div>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-yellow font-display text-xl font-bold text-brand-brown-dark">
                  {index + 1}
                </span>
                <h3 className="font-display text-xl font-semibold text-brand-brown-dark">
                  {step.title}
                </h3>
                <p className="text-brand-brown-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="keunggulan-judul"
          className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16"
        >
          <div className="rounded-card border border-warm-border bg-brand-white p-6 shadow-card sm:p-10">
            <h2
              id="keunggulan-judul"
              className="font-display text-3xl font-bold text-brand-brown-dark sm:text-4xl"
            >
              Kenapa bergabung
            </h2>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
              <div className="flex flex-col gap-4">
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-brand-orange text-brand-brown-dark"
                >
                  <FeaturedIcon className="size-7" />
                </span>
                <h3 className="font-display text-2xl font-bold text-brand-brown-dark sm:text-3xl">
                  {FEATURED_BENEFIT.title}
                </h3>
                <p className="max-w-[52ch] text-brand-brown-muted">
                  {FEATURED_BENEFIT.description}
                </p>
              </div>

              <dl className="flex flex-col divide-y divide-warm-border">
                {SECONDARY_BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="flex gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-brand-orange-deep"
                      >
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <dt className="font-display text-base font-semibold text-brand-brown-dark">
                          {benefit.title}
                        </dt>
                        <dd className="mt-1 text-sm text-brand-brown-muted">
                          {benefit.description}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="ajakan-judul"
          className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24"
        >
          <div className="relative overflow-hidden rounded-card bg-brand-yellow px-6 py-12 text-center shadow-card sm:px-12 sm:py-16">
            <svg
              aria-hidden
              viewBox="0 0 200 200"
              className="pointer-events-none absolute -bottom-24 -left-16 size-64 text-brand-yellow-light/60"
            >
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke="currentColor"
                strokeWidth="26"
              />
            </svg>
            <div className="relative">
              <h2
                id="ajakan-judul"
                className="mx-auto max-w-2xl font-display text-3xl font-bold text-brand-brown-dark sm:text-4xl"
              >
                Mulai kumpulkan poin pertama Anda
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-brand-brown-dark">
                Pendaftaran gratis. Cukup email dan username unik, lalu
                tunjukkan QR akun Anda di kasir.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  className="h-12 w-full rounded-button px-6 text-base font-semibold active:scale-[0.98] sm:w-auto"
                >
                  <Link href="/daftar">Daftar sekarang</Link>
                </Button>
                <Link
                  href="/masuk"
                  className="text-sm font-semibold text-brand-orange-deep underline-offset-4 hover:underline"
                >
                  Sudah punya akun? Masuk
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-brand-brown-dark text-brand-yellow-light">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Wordmark tone="dark" />
            <nav
              aria-label="Tautan kaki"
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <Link
                href="/syarat-ketentuan"
                className="text-sm text-brand-yellow underline-offset-4 hover:underline"
              >
                Syarat &amp; Ketentuan
              </Link>
              <Link
                href="/kebijakan-privasi"
                className="text-sm text-brand-yellow underline-offset-4 hover:underline"
              >
                Kebijakan Privasi
              </Link>
            </nav>
          </div>
          <p className="text-sm text-brand-yellow/70">
            © {year} Donjun Donat. Program loyalitas pelanggan.
          </p>
        </div>
      </footer>
    </>
  );
}
