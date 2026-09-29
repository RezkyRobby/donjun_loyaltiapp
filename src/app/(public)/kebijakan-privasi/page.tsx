import type { Metadata } from "next";
import Link from "next/link";

import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

// Halaman statis Kebijakan Privasi (PRD §10). Konten pada v1 dikelola sebagai
// halaman statis dan wajib tersedia di aplikasi pelanggan. Isi dokumen dipakai
// bersama dengan pop-up di area pelanggan melalui komponen PrivacyContent.
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

      <PrivacyContent />
    </main>
  );
}
