import { z } from "zod";

import { PaymentAccountType } from "@/generated/prisma/enums";

// Skema manajemen rekening tujuan transfer manual (PRD §5.3 fitur 9): tipe
// (transfer bank/e-wallet/QRIS), nama penyedia, nomor rekening, atas nama,
// urutan, dan status aktif. Gambar QRIS diunggah terpisah lewat Cloudinary.

export const PAYMENT_PROVIDER_NAME_MIN = 2;
export const PAYMENT_PROVIDER_NAME_MAX = 80;
export const PAYMENT_ACCOUNT_NUMBER_MAX = 60;
export const PAYMENT_ACCOUNT_HOLDER_MAX = 120;
export const PAYMENT_ACCOUNT_SORT_MAX = 9999;
export const PAYMENT_ACCOUNT_ID_MAX = 64;

export const paymentAccountTypeSchema = z.enum(PaymentAccountType, {
  error: "Jenis rekening tidak valid.",
});

function optionalText(max: number, error: string) {
  return z
    .string({ error })
    .trim()
    .max(max, { error })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

export const paymentAccountFormSchema = z.object({
  type: paymentAccountTypeSchema,
  providerName: z
    .string({ error: "Nama penyedia wajib diisi." })
    .trim()
    .min(PAYMENT_PROVIDER_NAME_MIN, {
      error: `Nama penyedia minimal ${PAYMENT_PROVIDER_NAME_MIN} karakter.`,
    })
    .max(PAYMENT_PROVIDER_NAME_MAX, {
      error: `Nama penyedia maksimal ${PAYMENT_PROVIDER_NAME_MAX} karakter.`,
    }),
  accountNumber: optionalText(
    PAYMENT_ACCOUNT_NUMBER_MAX,
    `Nomor rekening maksimal ${PAYMENT_ACCOUNT_NUMBER_MAX} karakter.`,
  ),
  accountHolder: optionalText(
    PAYMENT_ACCOUNT_HOLDER_MAX,
    `Nama pemilik rekening maksimal ${PAYMENT_ACCOUNT_HOLDER_MAX} karakter.`,
  ),
  sortOrder: z.coerce
    .number({ error: "Urutan tampil tidak valid." })
    .int({ error: "Urutan tampil harus bilangan bulat." })
    .min(0, { error: "Urutan tampil minimal 0." })
    .max(PAYMENT_ACCOUNT_SORT_MAX, {
      error: `Urutan tampil maksimal ${PAYMENT_ACCOUNT_SORT_MAX}.`,
    }),
  isActive: z.boolean({ error: "Status aktif tidak valid." }),
});

export type PaymentAccountFormInput = z.infer<typeof paymentAccountFormSchema>;

export const paymentAccountIdSchema = z
  .string({ error: "Rekening pembayaran tidak valid." })
  .trim()
  .min(1, { error: "Rekening pembayaran tidak valid." })
  .max(PAYMENT_ACCOUNT_ID_MAX, { error: "Rekening pembayaran tidak valid." });
