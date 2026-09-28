import { describe, expect, it } from "vitest";

import {
  ADJUST_NOTE_MIN_LENGTH,
  MAX_ADJUST_AMOUNT,
  REASON_MIN_LENGTH,
  VOUCHER_REVERT_WINDOW_MS,
  adjustPointsSchema,
  getRevertWindowRemainingMs,
  isAdjustmentAllowed,
  isWithinRevertWindow,
  voucherCorrectionSchema,
} from "@/lib/correction";

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date("2026-10-15T04:00:00.000Z");

const VALID_CODE = "DJN-23456789ABCDEFGH";
const VALID_USERNAME = "budisantoso";

describe("jendela koreksi voucher USED (1x24 jam)", () => {
  it("mengizinkan koreksi yang baru saja terpakai", () => {
    const usedAt = new Date(NOW.getTime() - HOUR_MS);
    expect(isWithinRevertWindow(usedAt, NOW)).toBe(true);
  });

  it("mengizinkan tepat pada batas 24 jam (inklusif)", () => {
    const usedAt = new Date(NOW.getTime() - VOUCHER_REVERT_WINDOW_MS);
    expect(isWithinRevertWindow(usedAt, NOW)).toBe(true);
    expect(getRevertWindowRemainingMs(usedAt, NOW)).toBe(0);
  });

  it("menolak satu milidetik setelah 24 jam", () => {
    const usedAt = new Date(NOW.getTime() - VOUCHER_REVERT_WINDOW_MS - 1);
    expect(isWithinRevertWindow(usedAt, NOW)).toBe(false);
    expect(getRevertWindowRemainingMs(usedAt, NOW)).toBeLessThan(0);
  });
});

describe("isAdjustmentAllowed", () => {
  it("mengizinkan koreksi positif", () => {
    expect(isAdjustmentAllowed(10, 3)).toBe(true);
  });

  it("mengizinkan koreksi negatif selama saldo tetap nol atau lebih", () => {
    expect(isAdjustmentAllowed(5, -5)).toBe(true);
  });

  it("menolak koreksi negatif yang membuat saldo minus", () => {
    expect(isAdjustmentAllowed(5, -6)).toBe(false);
    expect(isAdjustmentAllowed(0, -1)).toBe(false);
  });
});

describe("voucherCorrectionSchema", () => {
  it("menerima kode voucher dan alasan yang sah", () => {
    const result = voucherCorrectionSchema.safeParse({
      voucherCode: VALID_CODE,
      reason: "Kesalahan sistem saat penukaran poin",
    });

    expect(result.success).toBe(true);
  });

  it("menormalkan kode voucher ke huruf besar", () => {
    const result = voucherCorrectionSchema.safeParse({
      voucherCode: "djn-23456789abcdefgh",
      reason: "Kesalahan sistem saat penukaran poin",
    });

    expect(result.success && result.data.voucherCode).toBe(VALID_CODE);
  });

  it("menolak alasan kosong atau terlalu pendek", () => {
    expect(
      voucherCorrectionSchema.safeParse({
        voucherCode: VALID_CODE,
        reason: "",
      }).success,
    ).toBe(false);

    expect(
      voucherCorrectionSchema.safeParse({
        voucherCode: VALID_CODE,
        reason: "a".repeat(REASON_MIN_LENGTH - 1),
      }).success,
    ).toBe(false);
  });

  it("menolak kode voucher berformat salah", () => {
    expect(
      voucherCorrectionSchema.safeParse({
        voucherCode: "DJN-XXX",
        reason: "Kesalahan sistem saat penukaran poin",
      }).success,
    ).toBe(false);
  });
});

describe("adjustPointsSchema", () => {
  const VALID_NOTE = "Koreksi karena kesalahan injeksi poin";

  it("menerima koreksi positif dan negatif", () => {
    const positive = adjustPointsSchema.safeParse({
      username: VALID_USERNAME,
      amount: 5,
      note: VALID_NOTE,
    });
    const negative = adjustPointsSchema.safeParse({
      username: VALID_USERNAME,
      amount: -3,
      note: VALID_NOTE,
    });

    expect(positive.success).toBe(true);
    expect(negative.success).toBe(true);
  });

  it("mengubah jumlah poin berbentuk teks (form) menjadi angka", () => {
    const result = adjustPointsSchema.safeParse({
      username: VALID_USERNAME,
      amount: "7",
      note: VALID_NOTE,
    });

    expect(result.success && result.data.amount).toBe(7);
  });

  it("menolak jumlah poin nol, pecahan, atau di luar batas", () => {
    expect(
      adjustPointsSchema.safeParse({
        username: VALID_USERNAME,
        amount: 0,
        note: VALID_NOTE,
      }).success,
    ).toBe(false);

    expect(
      adjustPointsSchema.safeParse({
        username: VALID_USERNAME,
        amount: 1.5,
        note: VALID_NOTE,
      }).success,
    ).toBe(false);

    expect(
      adjustPointsSchema.safeParse({
        username: VALID_USERNAME,
        amount: MAX_ADJUST_AMOUNT + 1,
        note: VALID_NOTE,
      }).success,
    ).toBe(false);
  });

  it("mewajibkan catatan koreksi", () => {
    expect(
      adjustPointsSchema.safeParse({
        username: VALID_USERNAME,
        amount: 1,
        note: "",
      }).success,
    ).toBe(false);

    expect(
      adjustPointsSchema.safeParse({
        username: VALID_USERNAME,
        amount: 1,
        note: "a".repeat(ADJUST_NOTE_MIN_LENGTH - 1),
      }).success,
    ).toBe(false);
  });

  it("menormalkan username dan menolak format yang salah", () => {
    const result = adjustPointsSchema.safeParse({
      username: "BudiSantoso",
      amount: 1,
      note: VALID_NOTE,
    });

    expect(result.success && result.data.username).toBe(VALID_USERNAME);

    expect(
      adjustPointsSchema.safeParse({
        username: "ab",
        amount: 1,
        note: VALID_NOTE,
      }).success,
    ).toBe(false);
  });
});
