import { describe, expect, it } from "vitest";

import { ACCOUNT_QR_PREFIX, parseAccountQrPayload } from "@/lib/account-qr";

describe("parseAccountQrPayload", () => {
  it("mengekstrak username dari payload versi yang dikenal", () => {
    expect(parseAccountQrPayload(`${ACCOUNT_QR_PREFIX}budi.santoso`)).toEqual({
      valid: true,
      username: "budi.santoso",
    });
  });

  it("menormalkan username menjadi huruf kecil dan memangkas spasi", () => {
    expect(parseAccountQrPayload("  DONJUN:v1:Budi_Santoso  ")).toEqual({
      valid: true,
      username: "budi_santoso",
    });
  });

  it("menolak payload tanpa prefix Donjun", () => {
    expect(parseAccountQrPayload("https://contoh.id/abc")).toEqual({
      valid: false,
      error: "UNSUPPORTED_PAYLOAD",
    });
  });

  it("menolak versi payload yang tidak dikenal", () => {
    expect(parseAccountQrPayload("DONJUN:v2:budi.santoso")).toEqual({
      valid: false,
      error: "UNSUPPORTED_PAYLOAD",
    });
  });

  it("menolak username kosong setelah prefix", () => {
    expect(parseAccountQrPayload(ACCOUNT_QR_PREFIX)).toEqual({
      valid: false,
      error: "INVALID_USERNAME",
    });
  });

  it("menolak username yang tidak sesuai aturan PRD Lampiran A.1", () => {
    expect(parseAccountQrPayload(`${ACCOUNT_QR_PREFIX}9pendek`)).toEqual({
      valid: false,
      error: "INVALID_USERNAME",
    });
    expect(parseAccountQrPayload(`${ACCOUNT_QR_PREFIX}diakhiri_`)).toEqual({
      valid: false,
      error: "INVALID_USERNAME",
    });
  });
});
