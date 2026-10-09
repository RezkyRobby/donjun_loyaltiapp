import { describe, expect, it } from "vitest";

import { cancelOrderSchema, createOrderSchema } from "@/lib/shop";

describe("createOrderSchema", () => {
  const baseInput = {
    outletId: "outlet-1",
    paymentAccountId: "account-1",
    items: [{ menuId: "menu-1", quantity: "2" }],
  };

  it("menerima keranjang sah dan mengubah teks kosong menjadi null", () => {
    const parsed = createOrderSchema.safeParse(baseInput);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.items[0]?.quantity).toBe(2);
    expect(parsed.data.items[0]?.note).toBeNull();
    expect(parsed.data.items[0]?.optionTagIds).toEqual([]);
    expect(parsed.data.voucherId).toBeNull();
    expect(parsed.data.note).toBeNull();
  });

  it("menerima voucher dan opsi tag opsional", () => {
    const parsed = createOrderSchema.safeParse({
      ...baseInput,
      voucherId: "voucher-1",
      note: "Tolong dipisah",
      items: [
        {
          menuId: "menu-1",
          quantity: 1,
          note: "Extra coklat",
          optionTagIds: ["tag-1", "tag-2"],
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.voucherId).toBe("voucher-1");
    expect(parsed.data.items[0]?.optionTagIds).toEqual(["tag-1", "tag-2"]);
  });

  it("mengubah voucher kosong menjadi null", () => {
    const parsed = createOrderSchema.safeParse({ ...baseInput, voucherId: "" });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.voucherId).toBeNull();
  });

  it("menolak keranjang kosong", () => {
    expect(
      createOrderSchema.safeParse({ ...baseInput, items: [] }).success,
    ).toBe(false);
  });

  it("menolak jumlah di luar batas atau bukan bilangan bulat", () => {
    expect(
      createOrderSchema.safeParse({
        ...baseInput,
        items: [{ menuId: "menu-1", quantity: "0" }],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...baseInput,
        items: [{ menuId: "menu-1", quantity: "101" }],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...baseInput,
        items: [{ menuId: "menu-1", quantity: "1.5" }],
      }).success,
    ).toBe(false);
  });

  it("menolak outlet, rekening, atau menu yang kosong", () => {
    expect(
      createOrderSchema.safeParse({ ...baseInput, outletId: " " }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({ ...baseInput, paymentAccountId: "" })
        .success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...baseInput,
        items: [{ menuId: "", quantity: 1 }],
      }).success,
    ).toBe(false);
  });
});

describe("cancelOrderSchema", () => {
  it("menormalkan kode pesanan ke huruf besar", () => {
    expect(cancelOrderSchema.parse({ orderCode: "ord-23456789ab" })).toEqual({
      orderCode: "ORD-23456789AB",
    });
  });

  it("menolak kode pesanan tidak valid", () => {
    expect(cancelOrderSchema.safeParse({ orderCode: "ORD-123" }).success).toBe(
      false,
    );
  });
});
