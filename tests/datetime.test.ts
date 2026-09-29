import { describe, expect, it } from "vitest";

import {
  endOfDayWita,
  endOfMonthWita,
  formatDateWita,
  formatDateTimeWita,
  formatTimeWita,
  parseWitaDateEndInclusive,
  parseWitaDateStart,
  startOfDayWita,
  startOfMonthWita,
  witaDayKey,
} from "@/lib/datetime";

describe("format WITA", () => {
  it("mengonversi instant UTC ke waktu WITA (UTC+8)", () => {
    const instant = new Date("2026-09-27T00:30:00.000Z");

    expect(formatDateTimeWita(instant)).toBe("27 September 2026 08:30");
  });

  it("memakai nama bulan Bahasa Indonesia", () => {
    expect(formatDateWita(new Date("2026-08-17T00:00:00.000Z"))).toBe(
      "17 Agustus 2026",
    );
  });

  it("memformat jam WITA tanpa tanggal", () => {
    expect(formatTimeWita(new Date("2026-09-26T20:30:00.000Z"))).toBe("04:30");
  });

  it("menghitung kunci hari menurut WITA, bukan UTC", () => {
    expect(witaDayKey(new Date("2026-09-26T20:00:00.000Z"))).toBe("2026-09-27");
  });
});

describe("batas waktu WITA", () => {
  it("mengembalikan awal hari WITA sebagai instant UTC", () => {
    expect(startOfDayWita(new Date("2026-09-26T20:00:00.000Z")).toISOString()).toBe(
      "2026-09-26T16:00:00.000Z",
    );
  });

  it("mengembalikan akhir hari WITA sebagai awal hari berikutnya (UTC)", () => {
    expect(endOfDayWita(new Date("2026-09-26T20:00:00.000Z")).toISOString()).toBe(
      "2026-09-27T16:00:00.000Z",
    );
  });

  it("mengembalikan awal bulan WITA sebagai instant UTC", () => {
    expect(
      startOfMonthWita(new Date("2026-09-27T00:30:00.000Z")).toISOString(),
    ).toBe("2026-08-31T16:00:00.000Z");
  });

  it("mengembalikan akhir bulan WITA sebagai awal bulan berikutnya (UTC)", () => {
    expect(
      endOfMonthWita(new Date("2026-09-27T00:30:00.000Z")).toISOString(),
    ).toBe("2026-09-30T16:00:00.000Z");
  });

  it("mengembalikan akhir Desember sebagai awal Januari tahun berikutnya", () => {
    expect(
      endOfMonthWita(new Date("2026-12-15T00:00:00.000Z")).toISOString(),
    ).toBe("2026-12-31T16:00:00.000Z");
  });
});

describe("periode dari tanggal kalender WITA", () => {
  it("mengubah tanggal kalender menjadi awal hari WITA (UTC)", () => {
    expect(parseWitaDateStart("2026-09-27").toISOString()).toBe(
      "2026-09-26T16:00:00.000Z",
    );
  });

  it("mengubah tanggal kalender menjadi akhir hari WITA inklusif (UTC)", () => {
    expect(parseWitaDateEndInclusive("2026-09-27").toISOString()).toBe(
      "2026-09-27T15:59:59.999Z",
    );
  });

  it("menangani pergantian bulan pada akhir hari inklusif", () => {
    expect(parseWitaDateEndInclusive("2026-09-30").toISOString()).toBe(
      "2026-09-30T15:59:59.999Z",
    );
  });
});
