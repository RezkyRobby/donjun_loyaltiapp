import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-alert";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset kata sandi" };

// Better-Auth mengalihkan ke halaman ini dengan `?token=...` bila token sah,
// atau `?error=INVALID_TOKEN` bila token tidak valid atau kedaluwarsa
// (PRD §8.2 edge case).
export default async function ResetSandiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  const hasError = typeof params.error === "string";

  if (!token || hasError) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Tautan tidak valid
          </CardTitle>
          <CardDescription>
            Tautan pengaturan ulang kata sandi tidak valid atau sudah
            kedaluwarsa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormAlert tone="error">
            Tautan reset hanya berlaku 30 menit dan hanya dapat digunakan
            sekali.
          </FormAlert>
          <Link
            href="/lupa-sandi"
            className="text-sm font-medium text-brand-orange-deep underline"
          >
            Minta tautan baru
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Buat kata sandi baru
        </CardTitle>
        <CardDescription>
          Setelah kata sandi baru tersimpan, seluruh sesi aktif di perangkat
          lain akan dicabut.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
