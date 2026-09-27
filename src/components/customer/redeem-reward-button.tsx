"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { redeemReward } from "@/server/rewards/redeem";

// Tombol penukaran poin (PRD §8.4). Nonaktif saat syarat belum terpenuhi atau
// saat proses berjalan (anti klik ganda). Setelah berhasil, halaman disegarkan
// agar sisa kuota, limit, dan saldo terbarui.
export function RedeemRewardButton({
  rewardId,
  disabled,
  describedById,
}: {
  rewardId: string;
  disabled: boolean;
  describedById?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function handleRedeem() {
    setMessage(null);

    startTransition(async () => {
      const result = await redeemReward({ rewardId });

      if (result.ok) {
        setMessage({
          tone: "success",
          text: `Voucher ${result.voucherCode} berhasil dibuat. Buka menu Voucher untuk menunjukkannya kepada kasir.`,
        });
        router.refresh();
        return;
      }

      setMessage({ tone: "error", text: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={handleRedeem}
        disabled={disabled || isPending}
        aria-describedby={describedById}
        className="h-12 w-full"
      >
        {isPending ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Tukar poin
      </Button>
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}
    </div>
  );
}
