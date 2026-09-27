import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, pageOffset, parsePageParam } from "@/lib/pagination";

describe("parsePageParam", () => {
  it("memakai ukuran halaman default 50", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(50);
  });

  it("mengembalikan 1 saat parameter tidak ada", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });

  it("mengambil nilai pertama saat parameter berupa larik", () => {
    expect(parsePageParam(["3", "5"])).toBe(3);
  });

  it("menolak nilai tidak valid dan negatif", () => {
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-4")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
  });

  it("menerima halaman valid", () => {
    expect(parsePageParam("7")).toBe(7);
  });
});

describe("pageOffset", () => {
  it("menghitung offset berdasarkan ukuran halaman default", () => {
    expect(pageOffset(1)).toBe(0);
    expect(pageOffset(2)).toBe(50);
  });

  it("mendukung ukuran halaman khusus dan tidak pernah negatif", () => {
    expect(pageOffset(3, 10)).toBe(20);
    expect(pageOffset(-2, 10)).toBe(0);
  });
});
