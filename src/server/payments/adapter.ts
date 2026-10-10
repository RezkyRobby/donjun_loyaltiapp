import type { PaymentStatus } from "@/generated/prisma/enums";

// Kontrak adapter pembayaran provider-agnostic (PRD §8.9, AGENTS.md aturan 12).
// Seluruh pembayaran melewati entitas `OrderPayment`; pada v1 hanya transfer
// manual yang dikonfirmasi kasir. Gateway daring (mis. Midtrans) ditambahkan
// kelak sebagai implementasi `PaymentGatewayAdapter` tanpa migrasi skema.
// Berkas ini adalah *stub*: hanya mendefinisikan antarmuka, belum ada adapter
// yang terdaftar.

// Nama provider gateway tersimpan apa adanya pada `OrderPayment.provider`
// (mis. "MIDTRANS"). Transfer manual tidak melalui adapter (provider = null).
export type PaymentProviderName = string;

// Permintaan pembuatan tagihan daring untuk sebuah `OrderPayment`.
export type CreateChargeInput = {
  // Kode pesanan untuk korelasi dan rujukan idempotensi.
  orderCode: string;
  // ID `OrderPayment` yang menjadi kunci idempotensi pembuatan tagihan.
  paymentId: string;
  // Nominal tagihan (Rupiah) yang harus sama dengan `Order.total`.
  amount: number;
  customer: {
    name: string;
    email: string;
  };
};

// Data tagihan yang dikembalikan provider, dipetakan langsung ke kolom
// `OrderPayment` (vaNumber/qrString/providerRef/expiresAt) — tanpa mengubah
// model `Order`.
export type PaymentCharge = {
  providerRef: string;
  providerPaymentType: string;
  vaNumber: string | null;
  qrString: string | null;
  expiresAt: Date | null;
  rawPayload: unknown;
};

export type CreateChargeResult =
  | { ok: true; charge: PaymentCharge }
  | { ok: false; message: string };

// Permintaan webhook mentah: badan (raw body) dan header dipakai untuk
// memverifikasi tanda tangan provider. Route `/api/webhook/[provider]` tidak
// memakai sesi melainkan verifikasi tanda tangan (PRD Lampiran B).
export type WebhookRequest = {
  provider: PaymentProviderName;
  headers: Headers;
  rawBody: string;
};

// Peristiwa webhook yang telah dinormalisasi ke bentuk provider-agnostic.
export type NormalizedPaymentEvent = {
  provider: PaymentProviderName;
  providerRef: string;
  status: PaymentStatus;
  amount: number;
  paidAt: Date | null;
  // Kunci anti-duplikasi notifikasi ganda (mis. id peristiwa provider).
  idempotencyKey: string;
  rawPayload: unknown;
};

export type VerifyWebhookResult =
  | { ok: true; event: NormalizedPaymentEvent }
  | { ok: false; message: string };

// Antarmuka adapter gateway. Implementasi menyembunyikan detail provider:
// pembuatan tagihan (`createCharge`) dan verifikasi + normalisasi webhook
// (`verifyWebhook`). Pemetaan `NormalizedPaymentEvent.status` ke status pesanan
// dilakukan pemanggil webhook, bukan oleh adapter.
export interface PaymentGatewayAdapter {
  readonly provider: PaymentProviderName;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  verifyWebhook(request: WebhookRequest): Promise<VerifyWebhookResult>;
}
