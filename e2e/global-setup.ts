import { execSync } from "node:child_process";

import {
  e2eDatabaseUrl,
  resetDatabase,
  seedOutletAndReward,
  withE2eDb,
} from "./support/db";

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

  execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  await withE2eDb(async (client) => {
    await resetDatabase(client);
    await seedOutletAndReward(client);
  });
}
