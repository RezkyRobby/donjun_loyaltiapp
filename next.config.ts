import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gambar promo reward disimpan di Cloudinary (PRD §6 & §5.1 fitur 5).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // Unggah gambar promo via Server Action; naikkan batas dari 1 MB bawaan agar
    // berkas hingga 5 MB dapat diterima sebelum divalidasi (Task 27).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
