import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Kebijakan keamanan konten (CSP) untuk aplikasi pelanggan maupun staf. Skrip
// dan gaya bawaan Next.js memerlukan `unsafe-inline`; `unsafe-eval` hanya
// dibutuhkan oleh tooling pengembangan (React Refresh). Kamera hanya dipakai
// oleh portal kasir, sehingga `media-src` mengizinkan blob dari pemindaian.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Header keamanan respons (PRD §9): mencegah sniffing MIME, clickjacking,
// kebocoran referrer, dan pembatasan fitur peramban. HSTS hanya dikirim di
// produksi agar pengembangan lokal via HTTP tidak terkunci.
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Menyembunyikan identitas framework pada header respons.
  poweredByHeader: false,
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
