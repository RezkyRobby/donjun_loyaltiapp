import { describe, expect, it } from "vitest";

import {
  buildOpenInBrowserUrl,
  detectInAppBrowser,
  isAndroid,
} from "@/lib/device";

const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 335.0.0.32.101";
const WHATSAPP_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.8.76";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("detectInAppBrowser", () => {
  it("mengenali Instagram dan WhatsApp", () => {
    expect(detectInAppBrowser(INSTAGRAM_IOS)?.id).toBe("instagram");
    expect(detectInAppBrowser(WHATSAPP_ANDROID)?.id).toBe("whatsapp");
  });

  it("mengenali TikTok", () => {
    expect(
      detectInAppBrowser("Mozilla/5.0 (Linux; Android 13) TikTok/33.5.4")?.id,
    ).toBe("tiktok");
  });

  it("mengembalikan null pada peramban utama", () => {
    expect(detectInAppBrowser(CHROME_ANDROID)).toBeNull();
    expect(detectInAppBrowser(SAFARI_IOS)).toBeNull();
  });
});

describe("isAndroid", () => {
  it("membedakan Android dari iOS", () => {
    expect(isAndroid(CHROME_ANDROID)).toBe(true);
    expect(isAndroid(SAFARI_IOS)).toBe(false);
  });
});

describe("buildOpenInBrowserUrl", () => {
  it("membentuk tautan intent:// di Android", () => {
    const url = buildOpenInBrowserUrl(
      "https://loyalty.donjundonat.com/kasir/scan?x=1",
      WHATSAPP_ANDROID,
    );

    expect(url).toBe(
      "intent://loyalty.donjundonat.com/kasir/scan?x=1#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("mengembalikan null di iOS dan URL tidak valid", () => {
    expect(
      buildOpenInBrowserUrl("https://loyalty.donjundonat.com", SAFARI_IOS),
    ).toBeNull();
    expect(buildOpenInBrowserUrl("bukan-url", WHATSAPP_ANDROID)).toBeNull();
  });
});
