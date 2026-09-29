import { config as loadEnv } from "dotenv";

// Flag ketersediaan basis data E2E. Diimpor spec untuk melewati seluruh skenario
// bila E2E_DATABASE_URL tidak diisi, sehingga `pnpm test:e2e` tetap hijau tanpa
// infrastruktur.
loadEnv({ path: [".env.e2e.local", ".env.local", ".env"], quiet: true });

export const hasE2eDatabase = Boolean(process.env.E2E_DATABASE_URL?.trim());

// Lokasi penyimpanan sesi hasil login (storageState) agar spec dapat memakai
// ulang sesi tanpa login berulang — menjaga kuota rate limit login.
export const CUSTOMER_STATE_PATH = "test-results/e2e-customer.json";
export const CASHIER_STATE_PATH = "test-results/e2e-cashier.json";
