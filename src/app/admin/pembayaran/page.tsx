import { CreditCard, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActiveStatusBadge } from "@/components/admin/active-status-badge";
import { PaymentAccountActions } from "@/components/admin/payment-account-actions";
import { Button } from "@/components/ui/button";
import {
  EMPTY_VALUE_LABEL,
  PAYMENT_ACCOUNT_TYPE_LABELS,
} from "@/constants/labels";
import { formatCount } from "@/lib/format";
import {
  getAdminPaymentAccounts,
  type AdminPaymentAccount,
} from "@/server/admin/payment-account-list";

export const metadata: Metadata = { title: "Rekening Pembayaran" };

// Manajemen rekening tujuan transfer manual (PRD §5.3 fitur 9). Register
// *product* (design.md §2): tabel padat pada layar lebar, kartu pada layar
// sempit. Rekening yang sudah dipakai pembayaran hanya dapat dinonaktifkan.

function numberText(account: AdminPaymentAccount): string {
  if (account.accountNumber) return account.accountNumber;
  if (account.imageUrl) return "Gambar QRIS";

  return EMPTY_VALUE_LABEL;
}

export default async function AdminPaymentAccountPage() {
  const accounts = await getAdminPaymentAccounts();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
            Rekening Pembayaran
          </h1>
          <p className="text-sm text-brand-brown-muted">
            Kelola rekening tujuan transfer manual yang ditampilkan saat
            pelanggan checkout.
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/pembayaran/baru">
            <Plus aria-hidden className="size-4" />
            Tambah rekening
          </Link>
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-warm-border bg-card p-8 text-center">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
          >
            <CreditCard className="size-6" />
          </span>
          <h2 className="font-display text-lg font-semibold text-brand-brown-dark">
            Belum ada rekening pembayaran
          </h2>
          <p className="max-w-md text-sm text-brand-brown-muted">
            Tambahkan rekening transfer bank, e-wallet, atau QRIS agar pelanggan
            dapat membayar pesanan.
          </p>
          <Button asChild className="h-11">
            <Link href="/admin/pembayaran/baru">
              <Plus aria-hidden className="size-4" />
              Tambah rekening
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-warm-border lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-warm-neutral text-left text-caption uppercase tracking-wide text-brand-brown-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rekening
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nomor
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Atas nama
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Dipakai
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border bg-card">
                {accounts.map((account) => (
                  <tr key={account.id} className="h-14 align-middle">
                    <td className="px-4 py-2">
                      <p className="font-medium text-brand-brown-dark">
                        {account.providerName}
                      </p>
                      <p className="text-caption text-brand-brown-muted">
                        {PAYMENT_ACCOUNT_TYPE_LABELS[account.type]}
                      </p>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {numberText(account)}
                    </td>
                    <td className="px-4 py-2 text-brand-brown-dark">
                      {account.accountHolder ?? EMPTY_VALUE_LABEL}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-brand-brown-dark">
                      {formatCount(account.paymentCount)}
                    </td>
                    <td className="px-4 py-2">
                      <ActiveStatusBadge isActive={account.isActive} />
                    </td>
                    <td className="px-4 py-2">
                      <PaymentAccountActions
                        id={account.id}
                        isActive={account.isActive}
                        canDelete={account.paymentCount === 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 lg:hidden">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-3 rounded-card border border-warm-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-brown-dark">
                      {account.providerName}
                    </p>
                    <p className="text-caption text-brand-brown-muted">
                      {PAYMENT_ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </div>
                  <ActiveStatusBadge isActive={account.isActive} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-brand-brown-muted">Nomor</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {numberText(account)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Atas nama</dt>
                    <dd className="text-brand-brown-dark">
                      {account.accountHolder ?? EMPTY_VALUE_LABEL}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-brown-muted">Dipakai</dt>
                    <dd className="tabular-nums text-brand-brown-dark">
                      {formatCount(account.paymentCount)}
                    </dd>
                  </div>
                </dl>
                <PaymentAccountActions
                  id={account.id}
                  isActive={account.isActive}
                  canDelete={account.paymentCount === 0}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
