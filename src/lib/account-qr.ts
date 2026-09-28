import { z } from "zod";

import { USERNAME_PATTERN, normalizeUsername } from "@/lib/username";

// Payload QR akun pelanggan (PRD §5.1 fitur 4): `DONJUN:v1:<username>`.
// Prefix berisi versi agar scanner kasir hanya menerima format yang dikenal dan
// kompatibel; QR di luar format ini ditolak (PRD §8.3 edge case).
export const ACCOUNT_QR_PREFIX = "DONJUN:v1:";

export type AccountQrError = "UNSUPPORTED_PAYLOAD" | "INVALID_USERNAME";

export type AccountQrParseResult =
  | { valid: true; username: string }
  | { valid: false; error: AccountQrError };

// Parsing murni tanpa akses jaringan: dipakai klien untuk umpan balik seketika
// dan dijalankan ulang di Server Action (AGENTS.md aturan 1).
export function parseAccountQrPayload(payload: string): AccountQrParseResult {
  const trimmed = payload.trim();

  if (!trimmed.startsWith(ACCOUNT_QR_PREFIX)) {
    return { valid: false, error: "UNSUPPORTED_PAYLOAD" };
  }

  const username = normalizeUsername(trimmed.slice(ACCOUNT_QR_PREFIX.length));

  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, error: "INVALID_USERNAME" };
  }

  return { valid: true, username };
}

// Skema permukaan payload mentah sebelum parsing versi (batas panjang menjaga
// input berbahaya tidak masuk lebih jauh ke server).
export const accountQrPayloadSchema = z
  .string({ error: "Kode QR tidak valid." })
  .trim()
  .min(1, { error: "Kode QR tidak valid." })
  .max(128, { error: "Kode QR tidak valid." });
