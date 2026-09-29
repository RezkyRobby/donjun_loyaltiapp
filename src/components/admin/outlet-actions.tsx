"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { deleteOutlet, setOutletActive } from "@/server/admin/outlets";

// Aksi baris outlet (PRD §5.3 fitur 6, design.md §8: aksi baris eksplisit).
// Penghapusan hanya tersedia untuk outlet yang belum dipakai data operasional;
// penghapusan memakai konfirmasi dua langkah dengan fokus awal pada Batal.
export function OutletActions({
  id,
  isActive,
  canDelete,
}: {
  id: string;
  isActive: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function handleToggle() {
    setMessage(null);

    startTransition(async () => {
      const result = await setOutletActive(id, !isActive);

      if (result.ok) {
        setMessage({ tone: "success", text: result.message });
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  function handleDelete() {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteOutlet(id);

      setConfirmingDelete(false);

      if (result.ok) {
        setMessage({ tone: "success", text: result.message });
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href={`/admin/outlet/${id}`}>Ubah</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={handleToggle}
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
        {canDelete ? (
          confirmingDelete ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                ) : null}
                Ya, hapus
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => setConfirmingDelete(false)}
                disabled={isPending}
                autoFocus
              >
                Batal
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
            >
              Hapus
            </Button>
          )
        ) : null}
      </div>
      {message ? (
        <FormAlert tone={message.tone}>{message.text}</FormAlert>
      ) : null}
    </div>
  );
}
