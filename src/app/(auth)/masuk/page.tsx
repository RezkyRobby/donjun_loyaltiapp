import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-alert";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const justReset = params.reset === "sukses";

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">Masuk ke akun Anda</CardTitle>
        <CardDescription>
          Masuk untuk melihat saldo poin, promo, dan voucher Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {justReset ? (
          <FormAlert tone="success">
            Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru
            Anda.
          </FormAlert>
        ) : null}
        <LoginForm />
      </CardContent>
    </Card>
  );
}
