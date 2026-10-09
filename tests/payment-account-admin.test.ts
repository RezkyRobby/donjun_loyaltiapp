import { describe, expect, it } from "vitest";

import {
  paymentAccountFormSchema,
  paymentAccountIdSchema,
} from "@/lib/payment-account-admin";

const baseInput = {
  type: "BANK_TRANSFER",
  providerName: "BCA",
  accountNumber: "1234567890",
  accountHolder: "Donjun Donat",
  sortOrder: "0",
  isActive: true,
};

describe("paymentAccountFormSchema", () => {
  it("menerima tiap jenis rekening yang sah", () => {
    for (const type of ["BANK_TRANSFER", "EWALLET", "QRIS"] as const) {
      expect(
        paymentAccountFormSchema.safeParse({ ...baseInput, type }).success,
      ).toBe(true);
    }
  });

  it("mengubah nomor rekening kosong dan nama pemilik kosong menjadi null", () => {
    const parsed = paymentAccountFormSchema.safeParse({
      ...baseInput,
      accountNumber: "",
      accountHolder: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.accountNumber).toBeNull();
    expect(parsed.data.accountHolder).toBeNull();
  });

  it("menolak jenis rekening yang tidak dikenal", () => {
    expect(
      paymentAccountFormSchema.safeParse({ ...baseInput, type: "CRYPTO" })
        .success,
    ).toBe(false);
  });

  it("menolak nama penyedia terlalu pendek atau kosong", () => {
    expect(
      paymentAccountFormSchema.safeParse({ ...baseInput, providerName: "" })
        .success,
    ).toBe(false);
    expect(
      paymentAccountFormSchema.safeParse({ ...baseInput, providerName: "B" })
        .success,
    ).toBe(false);
  });

  it("menolak urutan negatif", () => {
    expect(
      paymentAccountFormSchema.safeParse({ ...baseInput, sortOrder: "-1" })
        .success,
    ).toBe(false);
  });
});

describe("paymentAccountIdSchema", () => {
  it("menerima id dan menolak yang kosong", () => {
    expect(paymentAccountIdSchema.safeParse("account-1").success).toBe(true);
    expect(paymentAccountIdSchema.safeParse("").success).toBe(false);
  });
});
