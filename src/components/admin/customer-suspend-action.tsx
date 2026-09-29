"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { setCustomerActive } from "@/server/admin/customers";

// Penangguhan/pengaktifan akun pelanggan (PRD §5.3 fitur 5). Penangguhan bersifat
// destruktif sehingga memakai konfirmasi dua langkah dengan fokus awal pada aksi
// paling tidak berbahaya (Batal). Menonaktifkan akun mencabut seluruh sesinya.
export function CustomerSuspendAction({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function handleToggle() {
    setMessage(null);

    startTransition(async () => {
      const result = await setCustomerActive(id, !isActive);

      setConfirming(false);

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
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            onClick={handleToggle}
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : null}
            Ya, tangguhkan
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            autoFocus
          >
            Batal
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant={isActive ? "destructive" : "secondary"}
          className="h-10"
          onClick={() =>
            isActive ? setConfirming(true) : handleToggle()
          }
          disabled={isPending}
        >
          {isActive ? "Tangguhkan akun" : "Aktifkan kembali"}
        </Button>
      )}
      {message ? (
        <FormAlert tone={message.tone}>{message.text}</FormAlert>
      ) : null}
    </div>
  );
}
