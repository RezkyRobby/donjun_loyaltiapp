import { createHash } from "node:crypto";

// Unggah gambar promo ke Cloudinary (PRD §6 & Lampiran C). Unggahan ditandatangani
// di server dengan `CLOUDINARY_API_SECRET` — tanpa SDK tambahan, cukup REST API
// Cloudinary. Rahasia tidak pernah dikirim ke klien.

export const REWARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REWARD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const REWARD_IMAGE_FOLDER = "donjun/reward";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Validasi berkas gambar sebelum diunggah. Fungsi murni agar dapat diuji tanpa
// jaringan; mengembalikan pesan galat Bahasa Indonesia atau null bila sah.
export function getRewardImageError(file: {
  type: string;
  size: number;
}): string | null {
  if (
    !REWARD_IMAGE_TYPES.includes(
      file.type as (typeof REWARD_IMAGE_TYPES)[number],
    )
  ) {
    return "Format gambar harus JPG, PNG, atau WebP.";
  }
  if (file.size <= 0) return "Berkas gambar tidak valid.";
  if (file.size > REWARD_IMAGE_MAX_BYTES) return "Ukuran gambar maksimal 5 MB.";

  return null;
}

// Menyisipkan transformasi `f_auto,q_auto` pada URL penyajian (design.md §9):
// Cloudinary mengirim WebP/AVIF otomatis sesuai dukungan peramban.
export function buildRewardImageUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
}

export type RewardImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadRewardImage(
  file: File,
): Promise<RewardImageUploadResult> {
  const validationError = getRewardImageError(file);

  if (validationError) return { ok: false, message: validationError };

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      ok: false,
      message: "Penyimpanan gambar (Cloudinary) belum dikonfigurasi.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Parameter tanda tangan wajib diurutkan alfabetis lalu ditambah api_secret.
  const signature = createHash("sha1")
    .update(`folder=${REWARD_IMAGE_FOLDER}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", REWARD_IMAGE_FOLDER);
  body.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body },
    );

    if (!response.ok) {
      console.error(
        "[cloudinary] unggah gagal dengan status",
        response.status,
      );

      return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
    }

    const data = (await response.json()) as { secure_url?: unknown };

    if (typeof data.secure_url !== "string") {
      return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
    }

    return { ok: true, url: buildRewardImageUrl(data.secure_url) };
  } catch (error) {
    console.error("[cloudinary] unggah gambar gagal", error);

    return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
  }
}
