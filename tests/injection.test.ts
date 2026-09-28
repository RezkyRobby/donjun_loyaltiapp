import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_POINT_COOLDOWN_SECONDS,
  getCooldownRemainingSeconds,
  getPointCooldownSeconds,
} from "@/lib/injection";

describe("getCooldownRemainingSeconds", () => {
  const now = new Date("2026-09-28T04:00:00.000Z");

  it("mengembalikan 0 bila belum ada injeksi sebelumnya", () => {
    expect(getCooldownRemainingSeconds(null, now, 60)).toBe(0);
  });

  it("mengembalikan sisa waktu dalam detik saat cooldown berjalan", () => {
    const last = new Date("2026-09-28T03:59:20.000Z");

    expect(getCooldownRemainingSeconds(last, now, 60)).toBe(20);
  });

  it("membulatkan sisa waktu ke atas", () => {
    const last = new Date("2026-09-28T03:59:20.500Z");

    expect(getCooldownRemainingSeconds(last, now, 60)).toBe(21);
  });

  it("mengembalikan 0 saat cooldown sudah lewat", () => {
    const last = new Date("2026-09-28T03:58:00.000Z");

    expect(getCooldownRemainingSeconds(last, now, 60)).toBe(0);
  });

  it("mengembalikan 0 saat cooldown dinonaktifkan", () => {
    const last = new Date("2026-09-28T03:59:59.000Z");

    expect(getCooldownRemainingSeconds(last, now, 0)).toBe(0);
  });
});

describe("getPointCooldownSeconds", () => {
  const original = process.env.POINT_COOLDOWN_SECONDS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.POINT_COOLDOWN_SECONDS;
    } else {
      process.env.POINT_COOLDOWN_SECONDS = original;
    }
  });

  it("memakai nilai dari environment bila valid", () => {
    process.env.POINT_COOLDOWN_SECONDS = "30";

    expect(getPointCooldownSeconds()).toBe(30);
  });

  it("memakai default saat nilai tidak ada atau tidak valid", () => {
    delete process.env.POINT_COOLDOWN_SECONDS;
    expect(getPointCooldownSeconds()).toBe(DEFAULT_POINT_COOLDOWN_SECONDS);

    process.env.POINT_COOLDOWN_SECONDS = "abc";
    expect(getPointCooldownSeconds()).toBe(DEFAULT_POINT_COOLDOWN_SECONDS);
  });
});
