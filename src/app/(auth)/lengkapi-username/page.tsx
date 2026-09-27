import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompleteUsernameForm } from "@/components/auth/complete-username-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRole } from "@/generated/prisma/enums";
import { homeForRole, isUserRole } from "@/lib/rbac";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Lengkapi username" };

// Pelanggan yang mendaftar via Google OAuth melengkapi username setelah
// otorisasi berhasil (PRD §8.1 langkah 5).
export default async function LengkapiUsernamePage() {
  const session = await getSession();

  if (!session) {
    redirect(`/masuk?callbackURL=${encodeURIComponent("/lengkapi-username")}`);
  }

  const role = isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CUSTOMER) {
    redirect(homeForRole(role));
  }

  if (session.user.username) {
    redirect("/dashboard");
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Lengkapi username Anda
        </CardTitle>
        <CardDescription>
          Halo {session.user.name}, pilih username unik yang akan dipakai kasir
          untuk menambah poin. Username dan email tidak dapat diubah setelah
          ditetapkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CompleteUsernameForm />
      </CardContent>
    </Card>
  );
}
