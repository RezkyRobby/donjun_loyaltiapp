import { randomUUID } from "node:crypto";

import { Client } from "pg";

import {
  E2E_MENU,
  E2E_MENU_CATEGORY,
  E2E_OUTLET,
  E2E_PAYMENT_ACCOUNT,
  E2E_REWARD,
} from "./seed-data";

// Utilitas basis data E2E. Test berjalan di proses Node Playwright dan mengakses
// basis data uji secara langsung lewat `pg` untuk menyiapkan kondisi (aktivasi
// email, promosi peran) dan memverifikasi hasil. Nilainya divalidasi/di-skip di
// tingkat spec, sehingga fungsi ini hanya dipanggil bila E2E aktif.

export function e2eDatabaseUrl(): string | null {
  const url = process.env.E2E_DATABASE_URL?.trim();

  return url && url.length > 0 ? url : null;
}

export async function withE2eDb<T>(
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const url = e2eDatabaseUrl();

  if (!url) {
    throw new Error(
      "E2E_DATABASE_URL belum diatur. Uji E2E memerlukan basis data terpisah.",
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// Urutan menghormati foreign key: anak lebih dulu, induk terakhir.
const TABLES_IN_DELETE_ORDER = [
  "OrderItemOption",
  "OrderItem",
  "OrderPaymentProof",
  "OrderPayment",
  "Order",
  "PointTransaction",
  "AuditLog",
  "Voucher",
  "RewardCatalog",
  "MenuOptionTag",
  "MenuOptionGroup",
  "Menu",
  "MenuCategory",
  "PaymentAccount",
  "Session",
  "Account",
  "Verification",
  "User",
  "Outlet",
] as const;

export async function resetDatabase(client: Client): Promise<void> {
  for (const table of TABLES_IN_DELETE_ORDER) {
    await client.query(`DELETE FROM "${table}"`);
  }
}

// Seed minimal: satu outlet penugasan kasir dan satu promo berbiaya 1 poin agar
// alur injeksi → penukaran → validasi dapat dijalankan dengan saldo 1.
export async function seedOutletAndReward(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO "Outlet" ("id", "name", "address", "phone", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, true, now(), now())`,
    [E2E_OUTLET.id, E2E_OUTLET.name, E2E_OUTLET.address, E2E_OUTLET.phone],
  );

  await client.query(
    `INSERT INTO "RewardCatalog" ("id", "title", "description", "pointsCost", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, true, now(), now())`,
    [E2E_REWARD.id, E2E_REWARD.title, E2E_REWARD.description, E2E_REWARD.pointsCost],
  );
}

// Seed katalog belanja: kategori, menu dengan grup opsi/tag, dan rekening
// tujuan transfer manual (PRD §5.4, §8.7).
export async function seedShopCatalog(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO "MenuCategory" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, now(), now())`,
    [E2E_MENU_CATEGORY.id, E2E_MENU_CATEGORY.name, E2E_MENU_CATEGORY.sortOrder],
  );

  await client.query(
    `INSERT INTO "Menu" ("id", "categoryId", "name", "description", "price", "isActive", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, NULL, $4, true, 0, now(), now())`,
    [E2E_MENU.id, E2E_MENU.categoryId, E2E_MENU.name, E2E_MENU.price],
  );

  await client.query(
    `INSERT INTO "MenuOptionGroup" ("id", "menuId", "name", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 0, now(), now())`,
    [E2E_MENU.optionGroup.id, E2E_MENU.id, E2E_MENU.optionGroup.name],
  );

  for (const tag of E2E_MENU.tags) {
    await client.query(
      `INSERT INTO "MenuOptionTag" ("id", "groupId", "name", "priceDelta", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 0, now(), now())`,
      [tag.id, E2E_MENU.optionGroup.id, tag.name, tag.priceDelta],
    );
  }

  await client.query(
    `INSERT INTO "PaymentAccount" ("id", "type", "providerName", "accountNumber", "accountHolder", "isActive", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2::"PaymentAccountType", $3, $4, $5, true, 0, now(), now())`,
    [
      E2E_PAYMENT_ACCOUNT.id,
      E2E_PAYMENT_ACCOUNT.type,
      E2E_PAYMENT_ACCOUNT.providerName,
      E2E_PAYMENT_ACCOUNT.accountNumber,
      E2E_PAYMENT_ACCOUNT.accountHolder,
    ],
  );
}

// Menandai email pelanggan sudah terverifikasi. Token verifikasi Better-Auth
// berupa JWT stateless yang hanya dikirim melalui SMTP, sehingga pada E2E
// pengiriman email eksternal disimulasikan dengan memperbarui status di basis
// data sebelum login.
export async function markEmailVerified(
  client: Client,
  email: string,
): Promise<void> {
  await client.query(
    `UPDATE "User" SET "emailVerified" = true WHERE "email" = $1`,
    [email],
  );
}

// Mengubah akun hasil registrasi menjadi kasir pada outlet uji.
export async function promoteToCashier(
  client: Client,
  email: string,
  outletId: string,
): Promise<void> {
  await client.query(
    `UPDATE "User" SET "emailVerified" = true, "role" = 'CASHIER', "outletId" = $2 WHERE "email" = $1`,
    [email, outletId],
  );
}

// Menghapus voucher tetap agar penyiapan voucher idempoten (uji dapat diulang).
export async function deleteVouchersByCode(
  client: Client,
  codes: string[],
): Promise<void> {
  await client.query(`DELETE FROM "Voucher" WHERE "voucherCode" = ANY($1)`, [
    codes,
  ]);
}

// Membuat voucher tetap milik pelanggan (dicari lewat email) agar alur belanja
// tidak bergantung pada injeksi poin. Id voucher disimpan agar dapat dirujuk.
export async function seedVoucher(
  client: Client,
  input: {
    id: string;
    code: string;
    email: string;
    rewardTitle: string;
    benefitType: "GENERIC" | "PERCENT_DISCOUNT" | "AMOUNT_DISCOUNT" | "PRODUCT";
    discountAmount: number;
  },
): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT "id" FROM "User" WHERE "email" = $1`,
    [input.email],
  );
  const userId = rows[0]?.id;

  if (!userId) {
    throw new Error(`Pengguna E2E dengan email ${input.email} tidak ditemukan.`);
  }

  await client.query(
    `INSERT INTO "Voucher" ("id", "voucherCode", "userId", "rewardId", "pointsSpent", "rewardTitle", "benefitType", "discountAmount", "status", "claimedAt")
     VALUES ($1, $2, $3, $4, 1, $5, $6::"RewardBenefitType", $7, 'ACTIVE'::"VoucherStatus", now())`,
    [
      input.id,
      input.code,
      userId,
      E2E_REWARD.id,
      input.rewardTitle,
      input.benefitType,
      input.discountAmount,
    ],
  );
}

export async function getOrderStatus(
  client: Client,
  orderCode: string,
): Promise<string | null> {
  const { rows } = await client.query<{ status: string }>(
    `SELECT "status" FROM "Order" WHERE "orderCode" = $1`,
    [orderCode],
  );

  return rows[0]?.status ?? null;
}

// Menyimulasikan unggahan bukti transfer tanpa Cloudinary: menambah bukti dan
// memindahkan pesanan ke AWAITING_CONFIRMATION (PRD §8.7 langkah 5).
export async function attachProofAndAwaitConfirmation(
  client: Client,
  orderCode: string,
): Promise<void> {
  await client.query(
    `INSERT INTO "OrderPaymentProof" ("id", "orderId", "imageUrl", "status", "uploadedAt")
     SELECT $1, o."id", $2, 'PENDING'::"OrderPaymentProofStatus", now()
     FROM "Order" o WHERE o."orderCode" = $3`,
    [
      randomUUID(),
      "https://res.cloudinary.com/uji/bukti-transfer.jpg",
      orderCode,
    ],
  );

  await client.query(
    `UPDATE "Order" SET "status" = 'AWAITING_CONFIRMATION'::"OrderStatus", "updatedAt" = now()
     WHERE "orderCode" = $1`,
    [orderCode],
  );
}
