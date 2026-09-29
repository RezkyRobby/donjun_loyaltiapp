"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { deleteReward, setRewardActive } from "@/server/admin/rewards";

// Aksi baris reward (PRD §5.3 fitur 2, design.md §8: aksi baris eksplisit, bukan
// ikon tanpa label). Penonaktifan dipakai sebagai pengganti penghapusan saat
// reward sudah memiliki voucher; tombol hapus hanya tampil bila belum ada
// voucher. Penghapusan memakai konfirmasi dua langkah dengan fokus awal pada
// aksi paling tidak berbahaya (Batal).

function Wrapper({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function RewardActions({
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
      const result = await setRewardActive(id, !isActive);

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
      const result = await deleteReward(id);

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
      <Wrapper>
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href={`/admin/reward/${id}`}>Ubah</Link>
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
      </Wrapper>
      {message ? (
        <FormAlert tone={message.tone}>{message.text}</FormAlert>
      ) : null}
    </div>
  );
}
