import { describe, expect, it } from "vitest";

import { formatPoints } from "@/lib/format";

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
