// Basis URL kanonik untuk metadata, sitemap, dan robots (PRD Lampiran C).
// Variabel environment dapat hadir sebagai string kosong pada sebagian
// lingkungan deploy, sehingga fallback dipakai saat nilai tidak ada, hanya
// berisi spasi, atau bukan URL absolut yang valid.
const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Nilai tidak valid diabaikan; gunakan fallback agar build tetap jalan.
    }
  }

  return FALLBACK_SITE_URL;
}
