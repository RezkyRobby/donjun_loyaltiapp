import { describe, expect, it } from "vitest";

import {
  ACCOUNT_QR_PAYLOAD_PREFIX,
  buildAccountQrPayload,
  OFFLINE_ROUTE,
  SERVICE_WORKER_PATH,
} from "@/lib/pwa";

describe("buildAccountQrPayload", () => {
  it("memakai format DONJUN:v1:<username>", () => {
    expect(buildAccountQrPayload("budi.donat")).toBe("DONJUN:v1:budi.donat");
  });

  it("menormalkan username ke huruf kecil dan membuang spasi tepi", () => {
    expect(buildAccountQrPayload("  Budi.Donat  ")).toBe(
      "DONJUN:v1:budi.donat",
    );
  });

  it("prefix selalu cocok dengan skema versi", () => {
    expect(ACCOUNT_QR_PAYLOAD_PREFIX).toBe("DONJUN:v1:");
    expect(buildAccountQrPayload("pelanggan234")).toMatch(
      /^DONJUN:v1:[a-z0-9._]+$/,
    );
  });
});

describe("konstanta PWA", () => {
  it("memakai path terpusat untuk service worker dan halaman offline", () => {
    expect(SERVICE_WORKER_PATH).toBe("/sw.js");
    expect(OFFLINE_ROUTE).toBe("/offline");
  });
});
