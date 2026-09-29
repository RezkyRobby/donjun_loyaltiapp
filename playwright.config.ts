import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Konfigurasi E2E Playwright (AGENTS.md: `pnpm test:e2e`, PRD §9.1). Uji hanya
// berjalan bila `E2E_DATABASE_URL` diisi; tanpa itu seluruh skenario di-skip dan
// tidak ada server yang dijalankan, sehingga `pnpm test:e2e` tetap hijau pada
// mesin tanpa basis data. Jalankan `pnpm test:e2e:install` sekali untuk memasang
// peramban Chromium.
loadEnv({ path: [".env.e2e.local", ".env.local", ".env"], quiet: true });

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;
const databaseUrl = process.env.E2E_DATABASE_URL?.trim();

export const hasE2eDatabase = Boolean(databaseUrl);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // Satu basis data bersama dipakai seluruh berkas; jalankan berurutan agar
  // penyiapan akun dan seed tidak saling mengganggu.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: hasE2eDatabase
    ? {
        command: `pnpm dev --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Arahkan aplikasi ke basis data E2E, bukan DATABASE_URL pengembangan.
          DATABASE_URL: databaseUrl ?? "",
          BETTER_AUTH_URL: baseURL,
          NEXT_PUBLIC_BASE_URL: baseURL,
          NEXT_PUBLIC_SITE_URL: baseURL,
        },
      }
    : undefined,
});
