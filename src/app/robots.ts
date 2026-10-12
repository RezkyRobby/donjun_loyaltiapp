import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

// Area privat (pelanggan, kasir, admin, API) tidak boleh diindeks mesin pencari
// (PRD §9 SEO).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/promo",
          "/voucher",
          "/pengaturan",
          "/kasir",
          "/admin",
          "/api/",
          "/offline",
          "/lengkapi-username",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
