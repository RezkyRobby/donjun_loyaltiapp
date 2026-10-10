import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentAccountForm } from "@/components/admin/payment-account-form";
import { Button } from "@/components/ui/button";
import { paymentAccountIdSchema } from "@/lib/payment-account-admin";
import { getAdminPaymentAccountById } from "@/server/admin/payment-account-list";

export const metadata: Metadata = { title: "Ubah Rekening Pembayaran" };

// Form perubahan rekening pembayaran (PRD §5.3 fitur 9).
export default async function AdminPaymentAccountEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idParsed = paymentAccountIdSchema.safeParse(id);

  if (!idParsed.success) notFound();

  const account = await getAdminPaymentAccountById(idParsed.data);

  if (!account) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 w-fit">
        <Link href="/admin/pembayaran">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke daftar rekening
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Ubah Rekening Pembayaran
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Perbarui detail rekening, urutan tampil, dan status aktif.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <PaymentAccountForm
          mode="edit"
          initial={{
            id: account.id,
            type: account.type,
            providerName: account.providerName,
            accountNumber: account.accountNumber ?? "",
            accountHolder: account.accountHolder ?? "",
            sortOrder: String(account.sortOrder),
            isActive: account.isActive,
            imageUrl: account.imageUrl,
          }}
        />
      </div>
    </section>
  );
}
