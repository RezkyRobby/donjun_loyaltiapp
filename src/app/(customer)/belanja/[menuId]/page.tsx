import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MenuDetailView } from "@/components/customer/menu-detail-view";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerMenuDetail } from "@/server/customer/shop";

export const metadata: Metadata = { title: "Detail menu" };

// Detail menu belanja (PRD §5.4 fitur 2). Menu yang tidak ditemukan atau sudah
// dinonaktifkan mengembalikan 404 agar tautan lama tidak menampilkan data usang.
export default async function CustomerMenuDetailPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  await requireCustomer();
  const { menuId } = await params;
  const menu = await getCustomerMenuDetail(menuId);

  if (!menu) notFound();

  return <MenuDetailView menu={menu} />;
}
