import { afterEach, describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/site-url";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("getSiteUrl", () => {
  it("memakai nilai environment bila URL absolut valid", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://loyalty.donjundonat.com";

    expect(getSiteUrl()).toBe("https://loyalty.donjundonat.com");
  });

  it("membuang spasi tepi dan normalisasi origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "  https://loyalty.donjundonat.com/id  ";

    expect(getSiteUrl()).toBe("https://loyalty.donjundonat.com");
  });

  it("memakai fallback saat variabel tidak diisi", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("memakai fallback saat variabel berupa string kosong", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("memakai fallback saat nilai bukan URL absolut yang valid", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "bukan-url";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
