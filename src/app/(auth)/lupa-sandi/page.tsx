import type { Metadata } from "next";
import Link from "next/link";

import { RequestResetForm } from "@/components/auth/request-reset-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function LupaSandiPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Atur ulang kata sandi
        </CardTitle>
        <CardDescription>
          Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata
          sandi baru.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RequestResetForm />
        <p className="text-center text-sm text-brand-brown-muted">
          Ingat kata sandi Anda?{" "}
          <Link
            href="/masuk"
            className="font-medium text-brand-orange-deep underline"
          >
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
