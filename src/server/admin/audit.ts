import type { Prisma } from "@/generated/prisma/client";

import type { AuditAction, AuditEntity } from "@/constants/audit";

// Penulis AuditLog terpusat (PRD §5.3 fitur 3, §7.4). Menerima klien transaksi
// interaktif agar catatan audit ikut dibatalkan bila mutasi utamanya gagal —
// audit log tidak pernah tercatat untuk aksi yang tidak benar-benar terjadi.
export type AuditLogInput = {
  actorId: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAuditLog(
  db: Prisma.TransactionClient,
  input: AuditLogInput,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  });
}
