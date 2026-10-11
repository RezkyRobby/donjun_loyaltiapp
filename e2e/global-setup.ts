import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

import {
  e2eDatabaseUrl,
  resetDatabase,
  seedOutletAndReward,
  seedShopCatalog,
  withE2eDb,
} from "./support/db";
import {
  CASHIER_ACCOUNT_PATH,
  CASHIER_STATE_PATH,
  CUSTOMER_ACCOUNT_PATH,
  CUSTOMER_STATE_PATH,
} from "./support/env";

// Penyiapan global E2E (dijalankan sekali sebelum seluruh berkas spec). Menyink-
// ronkan skema ke basis data uji lalu mengisi ulang data dasar. Bila
// E2E_DATABASE_URL kosong, tidak ada yang dijalankan sehingga `pnpm test:e2e`
// aman pada mesin tanpa basis data.
export default async function globalSetup(): Promise<void> {
  const databaseUrl = e2eDatabaseUrl();

  if (!databaseUrl) {
    console.warn(
      "[e2e] E2E_DATABASE_URL belum diatur — seluruh skenario E2E dilewati.",
    );
    return;
  }

  execSync("pnpm exec prisma db push --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  await withE2eDb(async (client) => {
    await resetDatabase(client);
    await seedOutletAndReward(client);
    await seedShopCatalog(client);
  });

  // Basis data baru saja dikosongkan, sehingga sesi tersimpan dari run
  // sebelumnya sudah tidak sah. Hapus artefak sesi agar spec menyiapkan akun
  // baru sekali lagi (lalu dipakai ulang lintas spec pada run ini).
  for (const path of [
    CUSTOMER_STATE_PATH,
    CASHIER_STATE_PATH,
    CUSTOMER_ACCOUNT_PATH,
    CASHIER_ACCOUNT_PATH,
  ]) {
    if (existsSync(path)) rmSync(path, { force: true });
  }
}
