import type {
  PaymentGatewayAdapter,
  PaymentProviderName,
} from "@/server/payments/adapter";

// Registri adapter gateway pembayaran (PRD §8.9). Kosong pada v1 — transfer
// manual dikonfirmasi kasir dan tidak melalui adapter. Saat gateway daring
// (mis. Midtrans) diaktifkan, adapter cukup didaftarkan di sini tanpa mengubah
// model `Order` maupun skema database.
const adapters = new Map<PaymentProviderName, PaymentGatewayAdapter>();

export function registerPaymentAdapter(adapter: PaymentGatewayAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getPaymentAdapter(
  provider: PaymentProviderName,
): PaymentGatewayAdapter | null {
  return adapters.get(provider) ?? null;
}

export function isPaymentProviderSupported(
  provider: PaymentProviderName,
): boolean {
  return adapters.has(provider);
}
