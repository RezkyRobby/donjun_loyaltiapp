// Konstanta PWA dan format payload QR akun (PRD §5.1 fitur 4, §9 PWA & Mode
// Offline). Nilai disimpan terpusat agar service worker, manifest, dan UI
// pelanggan tidak menduplikasi string yang sama.

// Service worker disajikan dari root `public/` sehingga cakupannya `scope: /`.
export const SERVICE_WORKER_PATH = "/sw.js";

// Halaman fallback saat navigasi offline tidak memiliki cache dokumen.
export const OFFLINE_ROUTE = "/offline";

// Versi terkecil saat ini; dinaikkan ketika format payload berubah.
export const ACCOUNT_QR_PAYLOAD_VERSION = "v1";

// AGENTS.md aturan 8: payload QR akun hanya `DONJUN:v1:<username>`. Scanner
// kasir (Fase 3) hanya menerima format ini.
export const ACCOUNT_QR_PAYLOAD_PREFIX = `DONJUN:${ACCOUNT_QR_PAYLOAD_VERSION}:`;

export function buildAccountQrPayload(username: string): string {
  return `${ACCOUNT_QR_PAYLOAD_PREFIX}${username.trim().toLowerCase()}`;
}
