import { describe, expect, it } from "vitest";

import {
  completeOrderSchema,
  confirmOrderSchema,
  orderStatusFilterSchema,
  rejectOrderSchema,
  uploadPaymentProofSchema,
} from "@/lib/order";

describe("confirmOrderSchema / completeOrderSchema", () => {
  it("menerima id pesanan yang sah", () => {
    expect(confirmOrderSchema.parse({ orderId: "order-1" })).toEqual({
      orderId: "order-1",
    });
    expect(completeOrderSchema.safeParse({ orderId: "order-1" }).success).toBe(
      true,
    );
  });

  it("menolak id pesanan kosong", () => {
    expect(confirmOrderSchema.safeParse({ orderId: "" }).success).toBe(false);
    expect(completeOrderSchema.safeParse({ orderId: " " }).success).toBe(false);
  });
});

describe("rejectOrderSchema", () => {
  it("menerima penolakan dengan alasan yang cukup", () => {
    const parsed = rejectOrderSchema.safeParse({
      orderId: "order-1",
      rejectionReason: "Bukti buram",
    });

    expect(parsed.success).toBe(true);
  });

  it("menolak alasan kosong atau terlalu pendek", () => {
    expect(
      rejectOrderSchema.safeParse({ orderId: "order-1", rejectionReason: "" })
        .success,
    ).toBe(false);
    expect(
      rejectOrderSchema.safeParse({ orderId: "order-1", rejectionReason: "no" })
        .success,
    ).toBe(false);
  });
});

describe("uploadPaymentProofSchema", () => {
  it("menormalkan kode pesanan ke huruf besar", () => {
    expect(uploadPaymentProofSchema.parse({ orderCode: "ord-23456789ab" })).toEqual(
      { orderCode: "ORD-23456789AB" },
    );
  });

  it("menolak kode pesanan tidak valid", () => {
    expect(
      uploadPaymentProofSchema.safeParse({ orderCode: "ORD-1" }).success,
    ).toBe(false);
  });
});

describe("orderStatusFilterSchema", () => {
  it("menerima ALL dan status pesanan yang sah", () => {
    expect(orderStatusFilterSchema.parse("ALL")).toBe("ALL");
    expect(orderStatusFilterSchema.parse("IN_PROGRESS")).toBe("IN_PROGRESS");
  });

  it("menolak status yang tidak dikenal", () => {
    expect(orderStatusFilterSchema.safeParse("BOGUS").success).toBe(false);
  });
});
