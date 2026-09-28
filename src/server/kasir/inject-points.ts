"use server";

import { Prisma } from "@/generated/prisma/client";
import {
  PointTransactionType,
  UserRole,
} from "@/generated/prisma/enums";
import {
  POINTS_PER_TRANSACTION,
  getCooldownRemainingSeconds,
  getPointCooldownSeconds,
  injectPointsSchema,
} from "@/lib/injection";
import { prisma } from "@/lib/prisma";
import { isUserRole } from "@/lib/rbac";
import { getSession } from "@/server/auth/session";

// Server Action injeksi poin (PRD §8.3, NFR §9). Menambah 1 poin secara atomik,
// mencatat PointTransaction bertipe EARN dengan cashierId, outletId, dan method,
// serta menegakkan idempotency key dan cooldown per pelanggan.
export type InjectPointsErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "NO_OUTLET"
  | "NOT_FOUND"
  | "SUSPENDED"
  | "COOLDOWN"
  | "ERROR";

export type InjectPointsResult =
  | { ok: true; pointsBalance: number }
  | {
      ok: false;
      code: InjectPointsErrorCode;
      message: string;
      retryAfterSeconds?: number;
    };

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Tabrakan kunci idempotensi berarti permintaan yang sama sudah tercatat:
// kembalikan hasil idempoten tanpa menambah poin lagi (NFR §9).
async function readIdempotentResult(
  idempotencyKey: string,
): Promise<InjectPointsResult | null> {
  const row = await prisma.pointTransaction.findUnique({
    where: { idempotencyKey },
    select: { customerId: true },
  });

  if (!row) return null;

  const customer = await prisma.user.findUnique({
    where: { id: row.customerId },
    select: { pointsBalance: true },
  });

  return { ok: true, pointsBalance: customer?.pointsBalance ?? 0 };
}

export async function injectPoints(
  input: unknown,
): Promise<InjectPointsResult> {
  const session = await getSession();

  if (!session || !isUserRole(session.user.role)) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const role = session.user.role;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const parsed = injectPointsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Permintaan injeksi tidak valid.",
    };
  }

  const { username, idempotencyKey, method } = parsed.data;
  const cashierId = session.user.id;

  try {
    const cashier = await prisma.user.findUnique({
      where: { id: cashierId },
      select: { outletId: true },
    });
    const outletId = cashier?.outletId ?? null;

    // Setiap injeksi wajib merekam outlet pelaksana (PRD §8.3).
    if (!outletId) {
      return {
        ok: false,
        code: "NO_OUTLET",
        message:
          "Akun Anda belum ditugaskan ke outlet. Hubungi Super Admin sebelum menambah poin.",
      };
    }

    const cooldownSeconds = getPointCooldownSeconds();

    return await prisma.$transaction(
      async (tx): Promise<InjectPointsResult> => {
        // Kunci baris pelanggan agar pemeriksaan cooldown dan pencatatan poin
        // berurutan untuk pelanggan yang sama, mencegah injeksi ganda saat dua
        // permintaan datang bersamaan.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "User" WHERE "username" = ${username} FOR UPDATE
        `;
        const customerId = locked[0]?.id;

        if (!customerId) {
          return {
            ok: false,
            code: "NOT_FOUND",
            message: "Pelanggan tidak ditemukan.",
          };
        }

        const customer = await tx.user.findUnique({
          where: { id: customerId },
          select: { role: true, isActive: true, pointsBalance: true },
        });

        if (!customer || customer.role !== UserRole.CUSTOMER) {
          return {
            ok: false,
            code: "NOT_FOUND",
            message: "Pelanggan tidak ditemukan.",
          };
        }

        if (!customer.isActive) {
          return {
            ok: false,
            code: "SUSPENDED",
            message:
              "Akun pelanggan sedang ditangguhkan sehingga tidak dapat menerima poin.",
          };
        }

        const existing = await tx.pointTransaction.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });

        if (existing) {
          return { ok: true, pointsBalance: customer.pointsBalance };
        }

        const lastEarn = await tx.pointTransaction.findFirst({
          where: { customerId, type: PointTransactionType.EARN },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        const remaining = getCooldownRemainingSeconds(
          lastEarn?.createdAt ?? null,
          new Date(),
          cooldownSeconds,
        );

        if (remaining > 0) {
          return {
            ok: false,
            code: "COOLDOWN",
            message: `Tunggu ${remaining} detik lagi sebelum menambah poin untuk pelanggan ini.`,
            retryAfterSeconds: remaining,
          };
        }

        const updated = await tx.user.update({
          where: { id: customerId },
          data: { pointsBalance: { increment: POINTS_PER_TRANSACTION } },
          select: { pointsBalance: true },
        });

        await tx.pointTransaction.create({
          data: {
            customerId,
            cashierId,
            type: PointTransactionType.EARN,
            amount: POINTS_PER_TRANSACTION,
            method,
            outletId,
            idempotencyKey,
          },
        });

        return { ok: true, pointsBalance: updated.pointsBalance };
      },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const idempotent = await readIdempotentResult(idempotencyKey);
      if (idempotent) return idempotent;
    }

    console.error("[injeksi] gagal menambah poin", error);

    return {
      ok: false,
      code: "ERROR",
      message: "Gagal menambah poin. Coba lagi sebentar lagi.",
    };
  }
}
