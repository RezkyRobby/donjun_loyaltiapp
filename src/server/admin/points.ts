"use server";

import {
  PointTransactionMethod,
  PointTransactionType,
  UserRole,
} from "@/generated/prisma/enums";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import {
  adjustPointsSchema,
  isAdjustmentAllowed,
  type AdjustPointsInput,
} from "@/lib/correction";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";

// Koreksi saldo poin manual oleh Super Admin (PRD §5.3 fitur 5, §8.5 langkah 4).
// Nilai bertanda (positif/negatif) dengan catatan alasan wajib; saldo tidak
// boleh negatif. Pemotongan memakai pembaruan kondisional di dalam transaksi
// agar aman terhadap permintaan bersamaan (AGENTS.md aturan 3). Setiap koreksi
// terekam pada PointTransaction (`ADJUST`) dan AuditLog.

export type AdjustPointsErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "NOT_FOUND"
  | "INSUFFICIENT_BALANCE"
  | "ERROR";

export type AdjustPointsResult =
  | { ok: true; pointsBalance: number; amount: number }
  | { ok: false; code: AdjustPointsErrorCode; message: string };

export async function adjustCustomerPoints(
  input: AdjustPointsInput,
): Promise<AdjustPointsResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Aksi ini hanya dapat dilakukan Super Admin.",
    };
  }

  const parsed = adjustPointsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Periksa kembali username, jumlah poin, dan catatan koreksi.",
    };
  }

  const { username, amount, note } = parsed.data;

  try {
    return await prisma.$transaction(
      async (tx): Promise<AdjustPointsResult> => {
        // Kunci baris pelanggan agar saldo dibaca dan diubah secara berurutan
        // untuk pelanggan yang sama (pola yang sama dengan injeksi poin).
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
          select: { role: true, pointsBalance: true },
        });

        if (!customer || customer.role !== UserRole.CUSTOMER) {
          return {
            ok: false,
            code: "NOT_FOUND",
            message: "Pelanggan tidak ditemukan.",
          };
        }

        const previousBalance = customer.pointsBalance;

        // Pemeriksaan awal untuk pesan yang jelas; penjamin akhirnya adalah
        // pembaruan kondisional di bawah ini.
        if (!isAdjustmentAllowed(previousBalance, amount)) {
          return {
            ok: false,
            code: "INSUFFICIENT_BALANCE",
            message: `Saldo pelanggan (${previousBalance} poin) tidak mencukupi untuk koreksi ${amount} poin.`,
          };
        }

        const updated = await tx.user.updateMany({
          where: {
            id: customerId,
            // Kondisi hanya relevan untuk koreksi negatif; untuk nilai positif
            // `gte` dengan angka negatif selalu benar.
            pointsBalance: { gte: -amount },
          },
          data: { pointsBalance: { increment: amount } },
        });

        if (updated.count === 0) {
          return {
            ok: false,
            code: "INSUFFICIENT_BALANCE",
            message: "Saldo pelanggan berubah dan tidak mencukupi koreksi ini.",
          };
        }

        const after = await tx.user.findUnique({
          where: { id: customerId },
          select: { pointsBalance: true },
        });
        const pointsBalance = after?.pointsBalance ?? previousBalance + amount;

        await tx.pointTransaction.create({
          data: {
            customerId,
            cashierId: actorId,
            type: PointTransactionType.ADJUST,
            amount,
            method: PointTransactionMethod.ADMIN,
            note,
          },
        });

        await recordAuditLog(tx, {
          actorId,
          action: AUDIT_ACTION.POINTS_ADJUSTED,
          entity: AUDIT_ENTITY.USER,
          entityId: customerId,
          metadata: {
            username,
            amount,
            previousBalance,
            newBalance: pointsBalance,
            note,
          },
        });

        return { ok: true, pointsBalance, amount };
      },
    );
  } catch (error) {
    console.error("[koreksi-poin] gagal menyesuaikan saldo poin", error);

    return {
      ok: false,
      code: "ERROR",
      message: "Gagal menyesuaikan saldo poin. Coba lagi sebentar lagi.",
    };
  }
}
