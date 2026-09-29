import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OutletForm } from "@/components/admin/outlet-form";
import { Button } from "@/components/ui/button";
import { outletIdSchema } from "@/lib/outlet-admin";
import { getAdminOutletById } from "@/server/admin/outlet-list";

export const metadata: Metadata = { title: "Ubah Outlet" };

// Form perubahan data outlet (PRD §5.3 fitur 6).
export default async function AdminOutletEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idParsed = outletIdSchema.safeParse(id);

  if (!idParsed.success) notFound();

  const outlet = await getAdminOutletById(idParsed.data);

  if (!outlet) notFound();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 w-fit">
        <Link href="/admin/outlet">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke daftar outlet
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-brown-dark">
          Ubah Outlet
        </h1>
        <p className="text-sm text-brand-brown-muted">
          Perbarui nama, alamat, kontak, atau status outlet.
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <OutletForm
          mode="edit"
          initial={{
            id: outlet.id,
            name: outlet.name,
            address: outlet.address,
            phone: outlet.phone ?? "",
            isActive: outlet.isActive,
          }}
        />
      </div>
    </section>
  );
}
