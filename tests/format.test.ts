import { describe, expect, it } from "vitest";

import { formatCount, formatPercent, formatPoints } from "@/lib/format";

describe("formatPoints", () => {
  it("memakai pemisah ribuan locale id-ID", () => {
    expect(formatPoints(1250)).toBe("1.250");
  });

  it("menampilkan nilai kecil tanpa pemisah", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(7)).toBe("7");
  });

  it("mendukung nilai besar", () => {
    expect(formatPoints(1_000_000)).toBe("1.000.000");
  });
});

describe("formatCount", () => {
  it("memakai pemisah ribuan locale id-ID", () => {
    expect(formatCount(1250)).toBe("1.250");
    expect(formatCount(0)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("memformat rasio sebagai persen id-ID", () => {
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.125)).toBe("12,5%");
  });

  it("menampilkan tanda pisah saat rasio belum dapat dihitung", () => {
    expect(formatPercent(null)).toBe("—");
  });
});
