import Link from "next/link";
import type { ReactNode } from "react";

// Shell halaman autentikasi pelanggan: latar brand, logo, dan kartu terpusat
// (design.md §2 register brand).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link href="/" className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-brand-orange font-display text-xl font-bold text-brand-brown-dark"
        >
          D
        </span>
        <span className="font-display text-xl font-bold text-brand-brown-dark">
          Donjun Donat
        </span>
      </Link>
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
