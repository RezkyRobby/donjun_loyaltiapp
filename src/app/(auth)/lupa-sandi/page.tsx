import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Lupa kata sandi" };

// Kerangka halaman lupa kata sandi. Alur pengiriman tautan reset dan
// penyimpanan kata sandi baru diimplementasikan pada Task 11.
export default function LupaSandiPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">Lupa kata sandi</CardTitle>
        <CardDescription>
          Pemulihan kata sandi akan tersedia pada pembaruan berikutnya.
          Sementara itu, hubungi admin bila Anda tidak dapat mengakses akun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/masuk"
          className="text-sm font-medium text-brand-orange-deep underline"
        >
          Kembali ke halaman masuk
        </Link>
      </CardContent>
    </Card>
  );
}
