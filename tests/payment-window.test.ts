import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES,
  getOrderPaymentWindowMinutes,
  getPaymentDueAt,
  isPaymentWindowExpired,
  shouldExpireOrder,
} from "@/lib/payment-window";

const originalWindow = process.env.ORDER_PAYMENT_WINDOW_MINUTES;

afterEach(() => {
  if (originalWindow === undefined) {
    delete process.env.ORDER_PAYMENT_WINDOW_MINUTES;
  } else {
    process.env.ORDER_PAYMENT_WINDOW_MINUTES = originalWindow;
  }
});

describe("getOrderPaymentWindowMinutes", () => {
  it("memakai default 24 jam bila variabel tidak diisi", () => {
    delete process.env.ORDER_PAYMENT_WINDOW_MINUTES;

    expect(getOrderPaymentWindowMinutes()).toBe(
      DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES,
    );
    expect(DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES).toBe(1440);
  });

  it("membaca nilai yang valid dari environment", () => {
    process.env.ORDER_PAYMENT_WINDOW_MINUTES = "30";

    expect(getOrderPaymentWindowMinutes()).toBe(30);
  });

  it("jatuh ke default bila nilai tidak valid atau di bawah 1", () => {
    process.env.ORDER_PAYMENT_WINDOW_MINUTES = "abc";
    expect(getOrderPaymentWindowMinutes()).toBe(
      DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES,
    );

    process.env.ORDER_PAYMENT_WINDOW_MINUTES = "0";
    expect(getOrderPaymentWindowMinutes()).toBe(
      DEFAULT_ORDER_PAYMENT_WINDOW_MINUTES,
    );
  });
});

describe("getPaymentDueAt", () => {
  it("menambahkan jendela pembayaran pada waktu pembuatan", () => {
    const createdAt = new Date("2026-10-09T00:00:00.000Z");

    expect(getPaymentDueAt(createdAt, 60).toISOString()).toBe(
      "2026-10-09T01:00:00.000Z",
    );
    expect(getPaymentDueAt(createdAt, 1440).toISOString()).toBe(
      "2026-10-10T00:00:00.000Z",
    );
  });
});

describe("isPaymentWindowExpired", () => {
  const due = new Date("2026-10-10T00:00:00.000Z");

  it("belum lewat sebelum tenggat", () => {
    expect(
      isPaymentWindowExpired(due, new Date("2026-10-09T23:59:59.999Z")),
    ).toBe(false);
  });

  it("tepat pada tenggat masih dianggap belum lewat", () => {
    expect(isPaymentWindowExpired(due, new Date("2026-10-10T00:00:00.000Z"))).toBe(
      false,
    );
  });

  it("lewat setelah tenggat", () => {
    expect(
      isPaymentWindowExpired(due, new Date("2026-10-10T00:00:00.001Z")),
    ).toBe(true);
  });
});

describe("shouldExpireOrder", () => {
  const due = new Date("2026-10-10T00:00:00.000Z");
  const now = new Date("2026-10-10T01:00:00.000Z");

  it("hanya menandai pesanan AWAITING_PAYMENT yang tenggatnya lewat", () => {
    expect(shouldExpireOrder("AWAITING_PAYMENT", due, now)).toBe(true);
  });

  it("tidak mengubah status pesanan lanjutan", () => {
    expect(shouldExpireOrder("AWAITING_CONFIRMATION", due, now)).toBe(false);
    expect(shouldExpireOrder("IN_PROGRESS", due, now)).toBe(false);
    expect(shouldExpireOrder("COMPLETED", due, now)).toBe(false);
  });

  it("tidak menandai bila tenggat belum lewat", () => {
    expect(
      shouldExpireOrder("AWAITING_PAYMENT", due, new Date("2026-10-09T12:00:00Z")),
    ).toBe(false);
  });
});
