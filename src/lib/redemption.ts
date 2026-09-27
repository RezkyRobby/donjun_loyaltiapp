import { z } from "zod";

// Skema input penukaran poin (PRD §8.4). Hanya `rewardId` yang berasal dari
// klien; identitas pelanggan diambil dari sesi di server. Validasi tetap
// dijalankan ulang di Server Action (AGENTS.md aturan 1).
export const redeemRewardSchema = z.object({
  rewardId: z
    .string({ error: "Promo tidak valid." })
    .trim()
    .min(1, { error: "Promo tidak valid." })
    .max(64, { error: "Promo tidak valid." }),
});

export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
