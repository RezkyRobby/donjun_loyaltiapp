// Deteksi in-app browser dan bantuan membuka tautan di peramban utama
// (PRD §9 Kompatibilitas Perangkat). Fungsi murni terhadap string user-agent
// agar dapat diuji tanpa DOM.

export type InAppBrowserInfo = {
  id: string;
  label: string;
};

const IN_APP_BROWSERS: Array<InAppBrowserInfo & { pattern: RegExp }> = [
  { id: "instagram", label: "Instagram", pattern: /Instagram/i },
  { id: "facebook", label: "Facebook", pattern: /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i },
  { id: "whatsapp", label: "WhatsApp", pattern: /WhatsApp/i },
  {
    id: "tiktok",
    label: "TikTok",
    pattern: /TikTok|BytedanceWebview|musical_ly/i,
  },
  { id: "line", label: "LINE", pattern: /Line\//i },
  { id: "twitter", label: "X", pattern: /\bTwitter/i },
  { id: "snapchat", label: "Snapchat", pattern: /SnapChat/i },
];

export function detectInAppBrowser(
  userAgent: string,
): InAppBrowserInfo | null {
  for (const { pattern, ...info } of IN_APP_BROWSERS) {
    if (pattern.test(userAgent)) return info;
  }

  // WebView umum: Android menandai "wv", iOS di luar Safari tidak menyertakan
  // token Safari pada user-agent.

  if (/;\s*wv\)/i.test(userAgent)) {
    return { id: "webview", label: "aplikasi lain" };
  }

  if (/(iPhone|iPad|iPod)/i.test(userAgent) && !/Safari/i.test(userAgent)) {
    return { id: "webview", label: "aplikasi lain" };
  }

  return null;
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

export type CameraOption = {
  id: string;
  label: string;
};

// Label kamera belakang berbeda antar peramban/bahasa ("Back Camera",
// "camera2 1, facing back", "Kamera Belakang", dsb.).
const REAR_CAMERA_PATTERN =
  /back|rear|environment|belakang|trasera|arrière|rück|后置/i;

// Memilih kamera belakang dari daftar perangkat berdasarkan label. Mengembalikan
// -1 bila label tidak informatif, sehingga pemanggil dapat memakai petunjuk
// facingMode sebagai gantinya.
export function findRearCameraIndex(cameras: CameraOption[]): number {
  return cameras.findIndex((camera) => REAR_CAMERA_PATTERN.test(camera.label));
}

// Android dapat membuka tautan langsung di Chrome lewat skema intent://.
// iOS tidak menyediakan padanan serupa; pengguna diarahkan secara manual.
export function buildOpenInBrowserUrl(
  target: string,
  userAgent: string,
): string | null {
  if (!isAndroid(userAgent)) return null;

  try {
    const url = new URL(target);
    const scheme = url.protocol.replace(":", "");

    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return null;
  }
}
