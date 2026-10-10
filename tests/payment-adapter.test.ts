import { describe, expect, it } from "vitest";

import type {
  CreateChargeResult,
  PaymentGatewayAdapter,
  VerifyWebhookResult,
} from "@/server/payments/adapter";
import {
  getPaymentAdapter,
  isPaymentProviderSupported,
  registerPaymentAdapter,
} from "@/server/payments/registry";

// Adapter tiruan untuk menguji resolusi registri; perilaku gateway sebenarnya
// belum diimplementasikan pada v1.
const fakeAdapter: PaymentGatewayAdapter = {
  provider: "FAKEPAY",
  async createCharge(): Promise<CreateChargeResult> {
    return { ok: false, message: "Belum diimplementasikan." };
  },
  async verifyWebhook(): Promise<VerifyWebhookResult> {
    return { ok: false, message: "Belum diimplementasikan." };
  },
};

describe("registri adapter pembayaran", () => {
  it("tidak menyediakan adapter gateway pada v1", () => {
    expect(getPaymentAdapter("MIDTRANS")).toBeNull();
    expect(isPaymentProviderSupported("MIDTRANS")).toBe(false);
  });

  it("mengembalikan adapter yang terdaftar berdasarkan nama provider", () => {
    registerPaymentAdapter(fakeAdapter);

    expect(getPaymentAdapter("FAKEPAY")).toBe(fakeAdapter);
    expect(isPaymentProviderSupported("FAKEPAY")).toBe(true);
    expect(getPaymentAdapter("LAINNYA")).toBeNull();
  });
});
