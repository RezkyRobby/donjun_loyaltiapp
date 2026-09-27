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
};

export default nextConfig;
