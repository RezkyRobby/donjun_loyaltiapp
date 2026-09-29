import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Navigasi halaman server-side (NFR §9). Dipakai oleh daftar terpaginasi area
// admin; URL tujuan dibangun pemanggil agar filter pencarian tetap terjaga.
export function PaginationNav({
  page,
  totalPages,
  buildHref,
  label,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;

  const prevHref = page > 1 ? buildHref(page - 1) : null;
  const nextHref = page < totalPages ? buildHref(page + 1) : null;

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3">
      {prevHref ? (
        <Button asChild variant="outline" className="h-11 px-4">
          <Link href={prevHref}>
            <ChevronLeft aria-hidden className="size-4" />
            Sebelumnya
          </Link>
        </Button>
      ) : (
        <span aria-hidden />
      )}
      <span className="text-sm text-brand-brown-muted">
        Halaman {page} dari {totalPages}
      </span>
      {nextHref ? (
        <Button asChild variant="outline" className="h-11 px-4">
          <Link href={nextHref}>
            Berikutnya
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
