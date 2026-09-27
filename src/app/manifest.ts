import type { MetadataRoute } from "next";

// Manifest PWA pelanggan (PRD §9 PWA & Mode Offline, design.md §12).
// theme_color #F6DE8C dan background_color #FDF8E8 mengikuti token brand.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Donjun Donat Loyalty",
    short_name: "Donjun Donat",
    description:
      "Kumpulkan poin di setiap transaksi, tukarkan dengan voucher promo, dan kelola akun loyalitas Anda.",
    lang: "id",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF8E8",
    theme_color: "#F6DE8C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
