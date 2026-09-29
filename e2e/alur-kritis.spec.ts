import { expect, test } from "@playwright/test";

import {
  prepareCashierSession,
  prepareCustomerSession,
  type E2eAccount,
} from "./support/account";
import { CASHIER_STATE_PATH, CUSTOMER_STATE_PATH, hasE2eDatabase } from "./support/env";

// Alur kritis (PRD §9.1): injeksi poin oleh kasir → penukaran poin pelanggan →
// validasi voucher oleh kasir (termasuk skenario voucher sudah terpakai), lalu
// pengujian kontrol akses berbasis peran (RBAC). Akun pelanggan & kasir disiapkan
// sekali di beforeAll dan sesinya dipakai ulang lewat storageState agar tidak
// menabrak rate limit login/registrasi.

let customer: E2eAccount;

test.beforeAll(async ({ browser }) => {
  if (!hasE2eDatabase) return;

  customer = await prepareCustomerSession(browser);
  await prepareCashierSession(browser);
});

function extractVoucherCode(text: string | null): string {
  const match = text?.match(/DJN-[A-Z0-9]{16}/);

  if (!match) {
    throw new Error(`Kode voucher tidak ditemukan pada pesan: ${text}`);
  }

  return match[0];
}

test.describe("alur kritis injeksi → tukar → validasi", () => {
  test.skip(!hasE2eDatabase, "E2E_DATABASE_URL belum diatur.");

  test("poin terinjeksi, voucher ditukar, lalu tervalidasi sekali", async ({
    browser,
  }) => {
    const cashierContext = await browser.newContext({
      storageState: CASHIER_STATE_PATH,
    });
    const customerContext = await browser.newContext({
      storageState: CUSTOMER_STATE_PATH,
    });

    try {
      const cashierPage = await cashierContext.newPage();
      const customerPage = await customerContext.newPage();

      // Kasir: injeksi 1 poin lewat input username manual (PRD §8.3).
      await cashierPage.goto("/kasir/scan");
      await cashierPage
        .getByRole("button", { name: "Input username manual" })
        .click();
      await cashierPage
        .getByLabel("Username pelanggan")
        .fill(customer.username);
      await cashierPage
        .getByRole("button", { name: new RegExp(`@${customer.username}`) })
        .click();
      await expect(cashierPage.getByRole("dialog")).toBeVisible();
      await cashierPage.getByRole("button", { name: "Tambah 1 Poin" }).click();
      await expect(
        cashierPage.getByText(/1 poin berhasil ditambahkan/),
      ).toBeVisible();
      await cashierPage.getByRole("button", { name: "Selesai" }).click();

      // Pelanggan: saldo bertambah lalu tukar promo (PRD §8.4).
      await customerPage.goto("/dashboard");
      await expect(
        customerPage.getByRole("region", { name: "Saldo poin Anda" }),
      ).toContainText("1");

      await customerPage.goto("/promo");
      await customerPage.getByRole("button", { name: "Tukar poin" }).click();
      const successMessage = customerPage.getByText(
        /Voucher DJN-[A-Z0-9]{16} berhasil dibuat/,
      );
      await expect(successMessage).toBeVisible();
      const voucherCode = extractVoucherCode(await successMessage.textContent());

      // Kasir: validasi kode manual → voucher sah (PRD §8.4 langkah 7).
      await cashierPage.goto("/kasir/validasi");
      await cashierPage
        .getByRole("button", { name: "Input kode manual" })
        .click();
      await cashierPage.getByLabel("Kode voucher").fill(voucherCode);
      await cashierPage.getByRole("button", { name: "Validasi kode" }).click();
      await expect(
        cashierPage.getByRole("heading", { name: "Voucher sah" }),
      ).toBeVisible();

      // Kasir: validasi ulang → ditolak karena sudah terpakai (single-use).
      await cashierPage
        .getByRole("button", { name: "Validasi voucher lain" })
        .click();
      await cashierPage
        .getByRole("button", { name: "Input kode manual" })
        .click();
      await cashierPage.getByLabel("Kode voucher").fill(voucherCode);
      await cashierPage.getByRole("button", { name: "Validasi kode" }).click();
      await expect(
        cashierPage.getByRole("heading", { name: "Voucher tidak sah" }),
      ).toBeVisible();
      await expect(cashierPage.getByText(/sudah terpakai/)).toBeVisible();

      // Pelanggan: voucher kini berstatus terpakai pada dompet voucher.
      await customerPage.goto("/voucher");
      await expect(customerPage.getByText("Terpakai")).toBeVisible();
    } finally {
      await cashierContext.close();
      await customerContext.close();
    }
  });
});

test.describe("kontrol akses berbasis peran", () => {
  test.skip(!hasE2eDatabase, "E2E_DATABASE_URL belum diatur.");

  test("tamu diarahkan ke halaman masuk", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/masuk/);

    await page.goto("/kasir/scan");
    await expect(page).toHaveURL(/\/masuk/);
  });

  test("pelanggan tidak dapat membuka area admin dan kasir", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: CUSTOMER_STATE_PATH,
    });
    const page = await context.newPage();

    try {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto("/kasir/scan");
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      await context.close();
    }
  });

  test("kasir tidak dapat membuka area admin", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: CASHIER_STATE_PATH,
    });
    const page = await context.newPage();

    try {
      await page.goto("/kasir/scan");
      await expect(page).toHaveURL(/\/kasir\/scan$/);

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/kasir\/scan$/);
    } finally {
      await context.close();
    }
  });

  test("endpoint admin menolak permintaan tanpa sesi", async ({ request }) => {
    const response = await request.get("/api/admin/audit/export");

    expect(response.status()).toBe(401);
  });
});
