import { expect, test } from "@playwright/test";

import { buildAccount, loginViaUi, registerViaUi } from "./support/account";
import { markEmailVerified, withE2eDb } from "./support/db";
import { hasE2eDatabase } from "./support/env";

// Alur registrasi pelanggan (PRD §8.1, §9.1): pendaftaran via UI → verifikasi
// email → login → dashboard. Verifikasi email memakai token JWT stateless yang
// hanya dikirim lewat SMTP; pengiriman email eksternal disimulasikan dengan
// menandai akun terverifikasi langsung di basis data uji.
test.describe("registrasi pelanggan", () => {
  test.skip(!hasE2eDatabase, "E2E_DATABASE_URL belum diatur.");

  test("registrasi, verifikasi email, dan login", async ({ page }) => {
    const account = buildAccount("customer");

    await registerViaUi(page, account);

    await withE2eDb((client) => markEmailVerified(client, account.email));

    await loginViaUi(page, account, /\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Beranda" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Saldo poin Anda" }),
    ).toContainText("0");
  });
});
