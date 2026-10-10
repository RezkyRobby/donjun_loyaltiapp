import { createHash } from "node:crypto";

// Unggah gambar ke Cloudinary (PRD §6 & Lampiran C): gambar promo reward,
// gambar menu, dan bukti transfer pesanan. Unggahan ditandatangani di server
// dengan `CLOUDINARY_API_SECRET` — tanpa SDK tambahan, cukup REST API
// Cloudinary. Rahasia tidak pernah dikirim ke klien.

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const REWARD_IMAGE_FOLDER = "donjun/reward";
const MENU_IMAGE_FOLDER = "donjun/menu";
const PAYMENT_ACCOUNT_IMAGE_FOLDER = "donjun/payment-account";
const PAYMENT_PROOF_FOLDER = "donjun/payment-proof";

export const REWARD_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
export const MENU_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
export const PAYMENT_ACCOUNT_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
export const PAYMENT_PROOF_MAX_BYTES = IMAGE_MAX_BYTES;

export const REWARD_IMAGE_TYPES = IMAGE_TYPES;
export const MENU_IMAGE_TYPES = IMAGE_TYPES;
export const PAYMENT_ACCOUNT_IMAGE_TYPES = IMAGE_TYPES;
export const PAYMENT_PROOF_TYPES = IMAGE_TYPES;

const IMAGE_FORMAT_ERROR = "Format gambar harus JPG, PNG, atau WebP.";
const IMAGE_EMPTY_ERROR = "Berkas gambar tidak valid.";

function imageSizeError(maxBytes: number): string {
  return `Ukuran gambar maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`;
}

type ImageValidationInput = { type: string; size: number };

type ImageKind = {
  folder: string;
  maxBytes: number;
  allowedTypes: readonly string[];
};

function getImageError(
  file: ImageValidationInput,
  allowedTypes: readonly string[],
  maxBytes: number,
): string | null {
  if (!allowedTypes.includes(file.type)) return IMAGE_FORMAT_ERROR;
  if (file.size <= 0) return IMAGE_EMPTY_ERROR;
  if (file.size > maxBytes) return imageSizeError(maxBytes);

  return null;
}

// Validasi berkas gambar sebelum diunggah. Fungsi murni agar dapat diuji tanpa
// jaringan; mengembalikan pesan galat Bahasa Indonesia atau null bila sah.
export function getRewardImageError(file: ImageValidationInput): string | null {
  return getImageError(file, REWARD_IMAGE_TYPES, REWARD_IMAGE_MAX_BYTES);
}

export function getMenuImageError(file: ImageValidationInput): string | null {
  return getImageError(file, MENU_IMAGE_TYPES, MENU_IMAGE_MAX_BYTES);
}

export function getPaymentAccountImageError(
  file: ImageValidationInput,
): string | null {
  return getImageError(
    file,
    PAYMENT_ACCOUNT_IMAGE_TYPES,
    PAYMENT_ACCOUNT_IMAGE_MAX_BYTES,
  );
}

export function getPaymentProofError(file: ImageValidationInput): string | null {
  return getImageError(file, PAYMENT_PROOF_TYPES, PAYMENT_PROOF_MAX_BYTES);
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Menyisipkan transformasi `f_auto,q_auto` pada URL penyajian (design.md §9):
// Cloudinary mengirim WebP/AVIF otomatis sesuai dukungan peramban.
export function buildOptimizedImageUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
}

export function buildRewardImageUrl(secureUrl: string): string {
  return buildOptimizedImageUrl(secureUrl);
}

export type ImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

async function uploadImage(
  file: File,
  kind: ImageKind,
): Promise<ImageUploadResult> {
  const validationError = getImageError(
    file,
    kind.allowedTypes,
    kind.maxBytes,
  );

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
    .update(`folder=${kind.folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", kind.folder);
  body.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body },
    );

    if (!response.ok) {
      console.error("[cloudinary] unggah gagal dengan status", response.status);

      return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
    }

    const data = (await response.json()) as { secure_url?: unknown };

    if (typeof data.secure_url !== "string") {
      return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
    }

    return { ok: true, url: buildOptimizedImageUrl(data.secure_url) };
  } catch (error) {
    console.error("[cloudinary] unggah gambar gagal", error);

    return { ok: false, message: "Gagal mengunggah gambar. Coba lagi." };
  }
}

export function uploadRewardImage(file: File): Promise<ImageUploadResult> {
  return uploadImage(file, {
    folder: REWARD_IMAGE_FOLDER,
    maxBytes: REWARD_IMAGE_MAX_BYTES,
    allowedTypes: REWARD_IMAGE_TYPES,
  });
}

export function uploadMenuImage(file: File): Promise<ImageUploadResult> {
  return uploadImage(file, {
    folder: MENU_IMAGE_FOLDER,
    maxBytes: MENU_IMAGE_MAX_BYTES,
    allowedTypes: MENU_IMAGE_TYPES,
  });
}

export function uploadPaymentAccountImage(
  file: File,
): Promise<ImageUploadResult> {
  return uploadImage(file, {
    folder: PAYMENT_ACCOUNT_IMAGE_FOLDER,
    maxBytes: PAYMENT_ACCOUNT_IMAGE_MAX_BYTES,
    allowedTypes: PAYMENT_ACCOUNT_IMAGE_TYPES,
  });
}

export function uploadPaymentProof(file: File): Promise<ImageUploadResult> {
  return uploadImage(file, {
    folder: PAYMENT_PROOF_FOLDER,
    maxBytes: PAYMENT_PROOF_MAX_BYTES,
    allowedTypes: PAYMENT_PROOF_TYPES,
  });
}
