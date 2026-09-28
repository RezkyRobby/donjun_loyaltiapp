import { z } from "zod";

import { USERNAME_PATTERN, normalizeUsername } from "@/lib/username";

// Aturan injeksi poin (PRD §8.3, NFR §9). Satu transaksi bernilai 1 poin;
// cooldown default 60 detik per pelanggan dan dapat dikonfigurasi lewat
// POINT_COOLDOWN_SECONDS tanpa mengubah skema.
export const POINTS_PER_TRANSACTION = 1;
export const DEFAULT_POINT_COOLDOWN_SECONDS = 60;

// Metode input yang boleh dikirim kasir: hasil pemindaian QR atau input
// username manual (PRD §8.3 langkah 4).
export const INJECTABLE_METHODS = ["QR_SCAN", "USERNAME"] as const;
export type InjectableMethod = (typeof INJECTABLE_METHODS)[number];

export function getPointCooldownSeconds(): number {
  const parsed = Number.parseInt(process.env.POINT_COOLDOWN_SECONDS ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_POINT_COOLDOWN_SECONDS;
  }

  return parsed;
}

// Sisa waktu tunggu cooldown; 0 berarti injeksi boleh dilakukan.
export function getCooldownRemainingSeconds(
  lastInjectionAt: Date | null,
  now: Date,
  cooldownSeconds: number,
): number {
  if (!lastInjectionAt || cooldownSeconds <= 0) return 0;

  const elapsedSeconds = (now.getTime() - lastInjectionAt.getTime()) / 1000;
  const remaining = cooldownSeconds - elapsedSeconds;

  return remaining > 0 ? Math.ceil(remaining) : 0;
}

// Skema input injeksi: username pelanggan, kunci idempotensi, dan metode input.
// Kunci idempotensi wajib sehingga retry jaringan tidak menggandakan poin
// (NFR §9). Validasi diulang di server (AGENTS.md aturan 1).
export const injectPointsSchema = z.object({
  username: z
    .string({ error: "Username pelanggan tidak valid." })
    .transform((value) => normalizeUsername(value))
    .pipe(
      z.string({ error: "Username pelanggan tidak valid." }).regex(USERNAME_PATTERN, {
        error: "Username pelanggan tidak valid.",
      }),
    ),
  idempotencyKey: z.uuid({ error: "Kunci idempotensi tidak valid." }),
  method: z.enum(INJECTABLE_METHODS, { error: "Metode injeksi tidak valid." }),
});

export type InjectPointsInput = z.infer<typeof injectPointsSchema>;
