import { Client } from "pg";

import { E2E_OUTLET, E2E_REWARD } from "./seed-data";

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
  "PointTransaction",
  "AuditLog",
  "Voucher",
  "RewardCatalog",
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
