import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Buat akun pelanggan
        </CardTitle>
        <CardDescription>
          Kumpulkan poin di setiap transaksi dan tukarkan dengan voucher promo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
