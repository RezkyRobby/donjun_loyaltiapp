import type { Metadata } from "next";

import { CartView } from "@/components/customer/cart-view";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerCheckoutOptions } from "@/server/customer/shop";

export const metadata: Metadata = { title: "Keranjang" };

// Keranjang & checkout pelanggan (PRD §5.4 fitur 3–4). Isi keranjang dibaca dari
// penyimpanan lokal pada sisi klien; opsi checkout (outlet, rekening, voucher)
// disiapkan di server.
export default async function CustomerCartPage() {
  const session = await requireCustomer();
  const options = await getCustomerCheckoutOptions(session.user.id);

  return <CartView options={options} />;
}
