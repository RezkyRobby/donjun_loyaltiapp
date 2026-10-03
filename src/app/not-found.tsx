import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

// Halaman 404 bermerek (PRD §9 SEO): pengguna diarahkan kembali ke beranda.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10 text-center">
      <p className="font-display text-5xl font-bold text-brand-orange">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Halaman tidak ditemukan
        </h1>
        <p className="max-w-md text-sm text-brand-brown-muted">
          Halaman yang Anda cari mungkin sudah dipindahkan atau tidak pernah
          ada. Silakan kembali ke beranda.
        </p>
      </div>
      <Button asChild className="h-12">
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </main>
  );
}
