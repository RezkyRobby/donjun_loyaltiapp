import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">Masuk ke akun Anda</CardTitle>
        <CardDescription>
          Masuk untuk melihat saldo poin, promo, dan voucher Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
