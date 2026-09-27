import type { Metadata, Viewport } from "next";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const baloo2 = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo-2",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Donjun Donat Loyalty",
    template: "%s · Donjun Donat Loyalty",
  },
  description:
    "Platform loyalitas pelanggan Donjun Donat: kumpulkan poin di setiap transaksi, tukarkan dengan voucher promo, dan kelola akun Anda secara mandiri.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Donjun Donat",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-icon-180.png",
  },
};

// PWA pelanggan (design.md §12): warna bilah peramban mengikuti theme_color
// brand dan mode standalone menghormati area aman perangkat.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F6DE8C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn(baloo2.variable, plusJakartaSans.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
