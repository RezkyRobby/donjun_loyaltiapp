// Alfabet kode bersama (AGENTS.md aturan 8): tanpa karakter ambigu 0/O/1/I/L
// agar kode voucher (DJN-) maupun kode pesanan (ORD-) aman dibaca & diinput
// manual. Satu sumber kebenaran sehingga kedua generator memakai alfabet sama.

export const SAFE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Byte dengan nilai >= batas ini dibuang agar pemetaan ke alfabet tidak bias
// (256 bukan kelipatan 31).
const MAX_UNBIASED_BYTE = 256 - (256 % SAFE_CODE_ALPHABET.length);

// Menghasilkan `length` karakter acak berentropi tinggi dari alfabet aman.
// Memakai Web Crypto yang tersedia di runtime Node maupun peramban sehingga
// kode tidak dapat diprediksi.
export function generateCodeSuffix(length: number): string {
  let suffix = "";

  while (suffix.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));

    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED_BYTE) continue;

      suffix += SAFE_CODE_ALPHABET[byte % SAFE_CODE_ALPHABET.length];

      if (suffix.length === length) break;
    }
  }

  return suffix;
}
