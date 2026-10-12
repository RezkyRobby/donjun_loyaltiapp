import type { Metadata, Viewport } from "next";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";

const baloo2 = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo-2",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

// Basis URL metadata untuk kanonik dan Open Graph (PRD Lampiran C).
const siteUrl = getSiteUrl();

const siteDescription =
  "Platform loyalitas pelanggan Donjun Donat: kumpulkan poin di setiap transaksi, tukarkan dengan voucher promo, dan kelola akun Anda secara mandiri.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Donjun Donat Loyalty",
    template: "%s · Donjun Donat Loyalty",
  },
  description: siteDescription,
  applicationName: "Donjun Donat Loyalty",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Donjun Donat Loyalty",
    title: "Donjun Donat Loyalty",
    description: siteDescription,
    url: "/",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Logo Donjun Donat Loyalty",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Donjun Donat Loyalty",
    description: siteDescription,
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
