"use client";

import { LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import {
  resendStaffInvitation,
  sendStaffCredentialsReset,
  setStaffActive,
} from "@/server/admin/staff";

// Aksi baris staf (PRD §5.3 fitur 4): kirim undangan/reset kredensial dan
// aktifkan/nonaktifkan. Penonaktifan mencabut seluruh sesi berjalan (PRD §8.6).
export function StaffActions({
  id,
  isActive,
  activated,
}: {
  id: string;
  isActive: boolean;
  activated: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function handleEmail() {
    setMessage(null);

    startTransition(async () => {
      const result = activated
        ? await sendStaffCredentialsReset(id)
        : await resendStaffInvitation(id);

      if (result.ok) {
        setMessage({ tone: "success", text: result.message });
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  function handleToggle() {
    setMessage(null);

    startTransition(async () => {
      const result = await setStaffActive(id, !isActive);

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleEmail}
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : activated ? (
            <RefreshCw aria-hidden className="size-4" />
          ) : (
            <Mail aria-hidden className="size-4" />
          )}
          {activated ? "Kirim tautan reset" : "Kirim ulang undangan"}
        </Button>
        <Button
          type="button"
          variant={isActive ? "destructive" : "secondary"}
          size="sm"
          className="h-9"
          onClick={handleToggle}
          disabled={isPending}
        >
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </div>
      {message ? (
        <FormAlert tone={message.tone}>{message.text}</FormAlert>
      ) : null}
    </div>
  );
}
