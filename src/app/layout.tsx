import type { Metadata } from "next";
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
