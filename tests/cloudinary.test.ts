import { describe, expect, it } from "vitest";

import {
  buildRewardImageUrl,
  getRewardImageError,
  REWARD_IMAGE_MAX_BYTES,
} from "@/lib/cloudinary";

describe("getRewardImageError", () => {
  it("menerima format gambar yang diizinkan", () => {
    expect(getRewardImageError({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(getRewardImageError({ type: "image/png", size: 1024 })).toBeNull();
    expect(getRewardImageError({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("menolak format di luar JPG, PNG, dan WebP", () => {
    expect(getRewardImageError({ type: "image/gif", size: 1024 })).toBe(
      "Format gambar harus JPG, PNG, atau WebP.",
    );
  });

  it("menolak berkas kosong", () => {
    expect(getRewardImageError({ type: "image/png", size: 0 })).toBe(
      "Berkas gambar tidak valid.",
    );
  });

  it("menolak berkas melebihi 5 MB", () => {
    expect(
      getRewardImageError({ type: "image/png", size: REWARD_IMAGE_MAX_BYTES + 1 }),
    ).toBe("Ukuran gambar maksimal 5 MB.");
  });
});

describe("buildRewardImageUrl", () => {
  it("menyisipkan transformasi f_auto,q_auto pada URL penyajian", () => {
    expect(
      buildRewardImageUrl(
        "https://res.cloudinary.com/donjun/image/upload/v123/donjun/reward/a.png",
      ),
    ).toBe(
      "https://res.cloudinary.com/donjun/image/upload/f_auto,q_auto/v123/donjun/reward/a.png",
    );
  });
});
