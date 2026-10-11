import { expect, test, type Page } from "@playwright/test";

import { prepareCashierSession, prepareCustomerSession } from "./support/account";
import {
  attachProofAndAwaitConfirmation,
  deleteVouchersByCode,
  getOrderStatus,
  seedVoucher,
  withE2eDb,
} from "./support/db";
import {
  CASHIER_STATE_PATH,
  CUSTOMER_STATE_PATH,
  hasCloudinary,
  hasE2eDatabase,
} from "./support/env";
import {
  E2E_MENU,
  E2E_OUTLET,
  E2E_PAYMENT_ACCOUNT,
  E2E_VOUCHER_DISCOUNT,
  E2E_VOUCHER_GENERIC,
} from "./support/seed-data";

// Alur belanja end-to-end (PRD §8.7–§8.8, §9.1): pelanggan memesan menu + opsi,
// menempel voucher pada checkout (voucher BELUM dikonsumsi), mengunggah bukti
// transfer, lalu kasir mengonfirmasi (voucher dikonsumsi sekali pakai) dan
// menandai selesai — beserta skenario penolakan bukti + unggah ulang.
//
// Sesi pelanggan/kasir disiapkan sekali (idempoten, lihat support/account.ts).
// Voucher tetap disemai lewat basis data agar alur tidak bergantung pada
// injeksi poin. Bila Cloudinary tidak dikonfigurasi, unggahan bukti disimulasikan
// langsung pada basis data (lihat support/db.ts) sehingga alur kasir tetap teruji.

const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function extractOrderCode(url: string): string {
  const match = url.match(/ORD-[A-Z0-9]{10}/);

  if (!match) throw new Error(`Kode pesanan tidak ditemukan pada URL: ${url}`);

  return match[0];
}

// Menelusuri katalog → detail menu (pilih satu opsi) → keranjang → checkout
// (tempel voucher + pilih outlet & rekening) → buat pesanan. Mengembalikan kode
// pesanan hasil pengalihan.
async function placeOrder(page: Page, voucherCode: string | null): Promise<string> {
  await page.goto("/belanja");
  await expect(
    page.getByRole("heading", { name: "Belanja", level: 1 }),
  ).toBeVisible();

  await page.getByRole("link", { name: new RegExp(E2E_MENU.name) }).click();
  await expect(
    page.getByRole("heading", { name: E2E_MENU.name, level: 1 }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: new RegExp(E2E_MENU.tags[0].name) })
    .click();
  await page.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await page.waitForURL(/\/keranjang$/);

  if (voucherCode) {
    await page.getByRole("radio", { name: new RegExp(voucherCode) }).check();
  }
  await page
    .getByRole("radio", { name: new RegExp(E2E_OUTLET.name) })
    .check();
  await page
    .getByRole("radio", { name: new RegExp(E2E_PAYMENT_ACCOUNT.providerName) })
    .check();

  await page.getByRole("button", { name: "Buat pesanan" }).click();
  await page.waitForURL(/\/pesanan\/ORD-[A-Z0-9]{10}$/);

  return extractOrderCode(page.url());
}

async function uploadProof(page: Page): Promise<void> {
  await page.getByLabel("Pilih gambar bukti").setInputFiles({
    name: "bukti-transfer.png",
    mimeType: "image/png",
    buffer: PNG_BUFFER,
  });
  await page.getByRole("button", { name: "Kirim bukti transfer" }).click();
  await expect(page.getByText(/Bukti transfer berhasil dikirim/)).toBeVisible({
    timeout: 20_000,
  });
}

// Memindahkan pesanan ke AWAITING_CONFIRMATION: melalui unggahan nyata bila
// Cloudinary tersedia, atau penyiapan basis data bila tidak.
async function bringToConfirmation(
  page: Page,
  orderCode: string,
): Promise<void> {
  if (hasCloudinary) {
    await uploadProof(page);
  } else {
    await withE2eDb((client) =>
      attachProofAndAwaitConfirmation(client, orderCode),
    );
    await page.reload();
  }
}

test.describe("alur belanja pelanggan", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(!hasE2eDatabase, "E2E_DATABASE_URL belum diatur.");

  test.beforeAll(async ({ browser }) => {
    if (!hasE2eDatabase) return;

    const customer = await prepareCustomerSession(browser);
    await prepareCashierSession(browser);

    await withE2eDb(async (client) => {
      await deleteVouchersByCode(client, [
        E2E_VOUCHER_DISCOUNT.code,
        E2E_VOUCHER_GENERIC.code,
      ]);
      await seedVoucher(client, {
        id: E2E_VOUCHER_DISCOUNT.id,
        code: E2E_VOUCHER_DISCOUNT.code,
        email: customer.email,
        rewardTitle: E2E_VOUCHER_DISCOUNT.rewardTitle,
        benefitType: "AMOUNT_DISCOUNT",
        discountAmount: E2E_VOUCHER_DISCOUNT.discountAmount,
      });
      await seedVoucher(client, {
        id: E2E_VOUCHER_GENERIC.id,
        code: E2E_VOUCHER_GENERIC.code,
        email: customer.email,
        rewardTitle: E2E_VOUCHER_GENERIC.rewardTitle,
        benefitType: "GENERIC",
        discountAmount: E2E_VOUCHER_GENERIC.discountAmount,
      });
    });
  });

  test("pesanan dengan voucher: buat → bukti → konfirmasi → selesai", async ({
    browser,
  }) => {
    const customerContext = await browser.newContext({
      storageState: CUSTOMER_STATE_PATH,
    });
    const cashierContext = await browser.newContext({
      storageState: CASHIER_STATE_PATH,
    });
    const customerPage = await customerContext.newPage();
    const cashierPage = await cashierContext.newPage();

    try {
      const orderCode = await placeOrder(
        customerPage,
        E2E_VOUCHER_DISCOUNT.code,
      );
      await expect(
        customerPage.getByText("Menunggu pembayaran", { exact: true }),
      ).toBeVisible();

      await bringToConfirmation(customerPage, orderCode);
      await expect(
        customerPage.getByText("Menunggu konfirmasi", { exact: true }),
      ).toBeVisible();

      // Kasir memeriksa antrean, membuka detail, lalu mengonfirmasi.
      await cashierPage.goto("/kasir/pesanan");
      await cashierPage.getByRole("link", { name: new RegExp(orderCode) }).click();
      await expect(
        cashierPage.getByRole("heading", { name: orderCode, level: 1 }),
      ).toBeVisible();
      await cashierPage
        .getByRole("button", { name: "Konfirmasi pembayaran" })
        .click();
      await expect(
        cashierPage.getByText(
          "Pembayaran dikonfirmasi. Pesanan mulai diproses.",
        ),
      ).toBeVisible();

      await cashierPage.getByRole("button", { name: "Tandai selesai" }).click();
      await expect(
        cashierPage.getByText("Pesanan ditandai selesai."),
      ).toBeVisible();

      // Pesanan selesai dan voucher terkonsumsi (single-use).
      expect(await withE2eDb((c) => getOrderStatus(c, orderCode))).toBe(
        "COMPLETED",
      );

      await customerPage.goto("/voucher");
      await expect(
        customerPage.getByText("Terpakai", { exact: true }).first(),
      ).toBeVisible();

      await customerPage.goto(`/pesanan/${orderCode}`);
      await expect(customerPage.getByText(/Pesanan selesai\./)).toBeVisible();
    } finally {
      await customerContext.close();
      await cashierContext.close();
    }
  });

  test("penolakan bukti transfer lalu unggah ulang", async ({ browser }) => {
    const customerContext = await browser.newContext({
      storageState: CUSTOMER_STATE_PATH,
    });
    const cashierContext = await browser.newContext({
      storageState: CASHIER_STATE_PATH,
    });
    const customerPage = await customerContext.newPage();
    const cashierPage = await cashierContext.newPage();

    try {
      const orderCode = await placeOrder(
        customerPage,
        E2E_VOUCHER_GENERIC.code,
      );
      await bringToConfirmation(customerPage, orderCode);
      await expect(
        customerPage.getByText("Menunggu konfirmasi", { exact: true }),
      ).toBeVisible();

      await cashierPage.goto("/kasir/pesanan");
      await cashierPage.getByRole("link", { name: new RegExp(orderCode) }).click();
      await cashierPage.getByRole("button", { name: "Tolak bukti" }).click();
      await cashierPage
        .getByLabel("Alasan penolakan")
        .fill("Bukti buram, mohon unggah ulang.");
      await cashierPage.getByRole("button", { name: "Kirim penolakan" }).click();
      await expect(
        cashierPage.getByText(
          "Pembayaran ditolak. Pelanggan dapat mengunggah ulang bukti.",
        ),
      ).toBeVisible();

      expect(await withE2eDb((c) => getOrderStatus(c, orderCode))).toBe(
        "REJECTED",
      );

      // Pelanggan melihat penolakan dan dapat mengunggah ulang.
      await customerPage.goto(`/pesanan/${orderCode}`);
      await expect(customerPage.getByText(/Bukti transfer ditolak/)).toBeVisible();
      await expect(
        customerPage.getByRole("heading", { name: "Unggah bukti transfer" }),
      ).toBeVisible();

      await bringToConfirmation(customerPage, orderCode);

      // Setelah unggah ulang, pesanan kembali menunggu konfirmasi dan voucher
      // tetap belum dikonsumsi.
      expect(await withE2eDb((c) => getOrderStatus(c, orderCode))).toBe(
        "AWAITING_CONFIRMATION",
      );
    } finally {
      await customerContext.close();
      await cashierContext.close();
    }
  });
});
