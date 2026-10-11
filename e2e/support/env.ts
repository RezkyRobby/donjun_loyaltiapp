import { config as loadEnv } from "dotenv";

// Flag ketersediaan basis data E2E. Diimpor spec untuk melewati seluruh skenario
// bila E2E_DATABASE_URL tidak diisi, sehingga `pnpm test:e2e` tetap hijau tanpa
// infrastruktur.
loadEnv({ path: [".env.e2e.local", ".env.local", ".env"], quiet: true });

export const hasE2eDatabase = Boolean(process.env.E2E_DATABASE_URL?.trim());

// Unggah bukti transfer berjalan melalui Server Action → Cloudinary. Skenario
// E2E yang benar-benar mengunggah berkas hanya dijalankan bila kredensial
// Cloudinary tersedia; tanpa itu skenario memakai penyiapan basis data.
export const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

// Lokasi penyimpanan sesi hasil login (storageState) agar spec dapat memakai
// ulang sesi tanpa login berulang — menjaga kuota rate limit login.
export const CUSTOMER_STATE_PATH = "test-results/e2e-customer.json";
export const CASHIER_STATE_PATH = "test-results/e2e-cashier.json";

// Identitas akun hasil penyiapan sesi, disimpan di samping storageState agar
// spec lain dapat memakai ulang akun yang sama tanpa registrasi ulang.
export const CUSTOMER_ACCOUNT_PATH = "test-results/e2e-customer.account.json";
export const CASHIER_ACCOUNT_PATH = "test-results/e2e-cashier.account.json";
