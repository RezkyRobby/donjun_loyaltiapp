import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { expect, type Browser, type Page } from "@playwright/test";

import { markEmailVerified, promoteToCashier, withE2eDb } from "./db";
import {
  CASHIER_ACCOUNT_PATH,
  CASHIER_STATE_PATH,
  CUSTOMER_ACCOUNT_PATH,
  CUSTOMER_STATE_PATH,
} from "./env";
import { E2E_OUTLET } from "./seed-data";

// Helper alur E2E: pembuatan akun unik, registrasi via UI, login, dan penyiapan
// sesi tersimpan. Akun pelanggan/kasir dibuat melalui registrasi publik agar
// kredensial di-hash persis seperti produksi, lalu perannya disesuaikan lewat
// basis data (akun kasir memang hanya dibuat Super Admin di produksi).
//
// Penyiapan bersifat idempoten: identitas akun disimpan di samping storageState
// sehingga beberapa spec dapat memakai ulang akun yang sama tanpa registrasi
// ulang, menjaga batas rate limit registrasi (maks 5/jam/IP).

export type E2eAccount = {
  name: string;
  email: string;
  username: string;
  password: string;
  domisili: string;
};

function readCachedAccount(path: string): E2eAccount | null {
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as E2eAccount;
  } catch {
    return null;
  }
}

function cacheAccount(path: string, account: E2eAccount): void {
  writeFileSync(path, JSON.stringify(account), "utf8");
}

export function buildAccount(kind: "customer" | "cashier"): E2eAccount {
  const suffix = String(Date.now()).slice(-8);

  return {
    name: kind === "customer" ? "Pelanggan E2E" : "Kasir E2E",
    email: `e2e.${kind}.${suffix}@contoh.test`,
    username: `${kind === "customer" ? "uji" : "kasir"}${suffix}`,
    password: "RahasiaE2E123",
    domisili: "Makassar",
  };
}

// Registrasi pelanggan lewat UI dan pastikan pesan sukses tampil.
export async function registerViaUi(
  page: Page,
  account: E2eAccount,
): Promise<void> {
  await page.goto("/daftar");
  await page.getByLabel("Nama lengkap").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Domisili").fill(account.domisili);
  await page.getByLabel("Username").fill(account.username);
  await page.getByLabel("Kata sandi", { exact: true }).fill(account.password);
  await page.getByLabel("Konfirmasi kata sandi").fill(account.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Daftar", exact: true }).click();

  // Registrasi menunggu pengiriman email verifikasi (SMTP) sehingga respons
  // dapat melewati batas bawaan 5 detik; beri ruang tunggu yang realistis.
  await expect(page.getByText(/Akun berhasil dibuat/)).toBeVisible({
    timeout: 20_000,
  });
}

export async function loginViaUi(
  page: Page,
  account: E2eAccount,
  expectedUrl: RegExp,
): Promise<void> {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();

  await page.waitForURL(expectedUrl, { timeout: 30_000 });
}

// Menyiapkan akun pelanggan: registrasi, aktivasi email, login, lalu simpan sesi.
export async function prepareCustomerSession(
  browser: Browser,
): Promise<E2eAccount> {
  const cached = readCachedAccount(CUSTOMER_ACCOUNT_PATH);

  if (cached && existsSync(CUSTOMER_STATE_PATH)) return cached;

  const account = buildAccount("customer");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await registerViaUi(page, account);
    await withE2eDb((client) => markEmailVerified(client, account.email));
    await loginViaUi(page, account, /\/dashboard$/);
    await context.storageState({ path: CUSTOMER_STATE_PATH });
    cacheAccount(CUSTOMER_ACCOUNT_PATH, account);
  } finally {
    await context.close();
  }

  return account;
}

// Menyiapkan akun kasir: registrasi, promosi peran + penugasan outlet, login,
// lalu simpan sesi.
export async function prepareCashierSession(
  browser: Browser,
): Promise<E2eAccount> {
  const cached = readCachedAccount(CASHIER_ACCOUNT_PATH);

  if (cached && existsSync(CASHIER_STATE_PATH)) return cached;

  const account = buildAccount("cashier");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await registerViaUi(page, account);
    await withE2eDb((client) =>
      promoteToCashier(client, account.email, E2E_OUTLET.id),
    );
    await loginViaUi(page, account, /\/kasir\/scan$/);
    await context.storageState({ path: CASHIER_STATE_PATH });
    cacheAccount(CASHIER_ACCOUNT_PATH, account);
  } finally {
    await context.close();
  }

  return account;
}
