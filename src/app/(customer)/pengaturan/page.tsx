import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormAlert } from "@/components/auth/form-alert";
import { PasswordForm } from "@/components/customer/password-form";
import { ProfileForm } from "@/components/customer/profile-form";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Pengaturan" };

// Pengaturan akun pelanggan (PRD §5.1 fitur 7, §10). Username dan email
// bersifat permanen; hanya nama, nomor telepon, dan kata sandi yang dapat
// diubah. Bagian privasi menautkan dokumen hukum dan menjelaskan hak subjek
// data.
export default async function CustomerSettingsPage() {
  const session = await requireCustomer();

  const [user, credential] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, username: true, phone: true },
    }),
    prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential",
        password: { not: null },
      },
      select: { id: true },
    }),
  ]);

  if (!user) {
    redirect("/masuk");
  }

  if (!user.username) {
    redirect("/lengkapi-username");
  }

  const hasPassword = credential !== null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Pengaturan
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Kelola data akun, kata sandi, dan privasi Anda.
        </p>
      </div>

      <section
        aria-labelledby="identitas-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
      >
        <h2
          id="identitas-judul"
          className="font-display text-lg font-semibold text-brand-brown-dark"
        >
          Identitas akun
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-brown-muted">Username</dt>
            <dd className="font-medium text-brand-brown-dark">
              @{user.username}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-brand-brown-muted">Email</dt>
            <dd className="truncate font-medium text-brand-brown-dark">
              {user.email}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-brand-brown-muted">
          Username dan email bersifat permanen dan tidak dapat diubah.
        </p>
      </section>

      <section
        aria-labelledby="profil-judul"
        className="flex flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card"
      >
        <h2
          id="profil-judul"
          className="font-display text-lg font-semibold text-brand-brown-dark"
        >
          Data akun
        </h2>
        <ProfileForm initialName={user.name} initialPhone={user.phone ?? ""} />
      </section>

      <section
        aria-labelledby="sandi-judul"
        className="flex flex-col gap-4 rounded-card border border-warm-border bg-card p-4 shadow-card"
      >
        <h2
          id="sandi-judul"
          className="font-display text-lg font-semibold text-brand-brown-dark"
        >
          Kata sandi
        </h2>
        {hasPassword ? (
          <PasswordForm />
        ) : (
          <FormAlert tone="info">
            Akun Anda masuk melalui Google sehingga belum memiliki kata sandi
            untuk diubah.
          </FormAlert>
        )}
      </section>

      <section
        aria-labelledby="privasi-judul"
        className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4 shadow-card"
      >
        <h2
          id="privasi-judul"
          className="font-display text-lg font-semibold text-brand-brown-dark"
        >
          Privasi &amp; ketentuan
        </h2>
        <p className="text-sm text-brand-brown-muted">
          Dengan mendaftar, Anda telah menyetujui Kebijakan Privasi dan Syarat
          dan Ketentuan program loyalitas Donjun Donat.
        </p>
        <p className="text-sm text-brand-brown-muted">
          Data yang dikumpulkan mencakup nama, email, nomor telepon (opsional),
          foto profil (bila masuk dengan Google), dan riwayat transaksi poin.
        </p>
        <p className="text-sm text-brand-brown-muted">
          Untuk mengakses, mengoreksi, atau meminta penghapusan data pribadi
          Anda, hubungi admin Donjun Donat.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/kebijakan-privasi"
            className="text-sm font-medium text-brand-orange-deep underline"
          >
            Kebijakan Privasi
          </Link>
          <Link
            href="/syarat-ketentuan"
            className="text-sm font-medium text-brand-orange-deep underline"
          >
            Syarat dan Ketentuan
          </Link>
        </div>
      </section>
    </section>
  );
}
