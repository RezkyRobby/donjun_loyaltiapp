import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { parseAuditLogFilters } from "@/lib/audit-log";
import { getAuditLogEntries } from "@/server/admin/audit-log";

import {
  createCashier,
  createCustomer,
  createEarnTransaction,
  createOutlet,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";

// Audit Log Menyeluruh diuji terhadap basis data uji: penggabungan transaksi
// poin (PointTransaction) dengan aksi administratif (AuditLog) serta filter
// tanggal/outlet/pelaku/tipe aksi (PRD §5.3 fitur 3).
describe.skipIf(!hasTestDatabase)("integrasi audit log", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("menggabungkan dua sumber dan mengurutkan menurun", async () => {
    const outlet = await createOutlet();
    const cashier = await createCashier(outlet.id);
    const customer = await createCustomer({ username: "pelanggan.audit" });

    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outlet.id,
      idempotencyKey: "audit-1",
      createdAt: new Date("2026-10-15T03:00:00.000Z"),
    });
    await testPrisma.auditLog.create({
      data: {
        actorId: cashier.id,
        action: "REWARD_CREATED",
        entity: "RewardCatalog",
        entityId: "reward-1",
        createdAt: new Date("2026-10-15T04:00:00.000Z"),
      },
    });

    const result = await getAuditLogEntries(parseAuditLogFilters({}), 1);

    expect(result.total).toBe(2);
    expect(result.entries.map((entry) => entry.source)).toEqual([
      "ADMIN",
      "POINT",
    ]);
  });

  it("memfilter berdasarkan outlet (hanya transaksi poin)", async () => {
    const outletA = await createOutlet("Outlet A");
    const outletB = await createOutlet("Outlet B");
    const cashier = await createCashier(outletA.id);
    const customer = await createCustomer({ username: "pelanggan.outlet" });

    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outletA.id,
      idempotencyKey: "audit-a",
      createdAt: new Date("2026-10-15T03:00:00.000Z"),
    });
    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outletB.id,
      idempotencyKey: "audit-b",
      createdAt: new Date("2026-10-15T03:10:00.000Z"),
    });

    const result = await getAuditLogEntries(
      parseAuditLogFilters({ outlet: outletA.id }),
      1,
    );

    expect(result.total).toBe(1);
    expect(result.entries[0]?.outletName).toBe("Outlet A");
  });

  it("memfilter berdasarkan tipe aksi pada kedua sumber", async () => {
    const outlet = await createOutlet();
    const cashier = await createCashier(outlet.id);
    const customer = await createCustomer({ username: "pelanggan.aksi" });

    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outlet.id,
      idempotencyKey: "audit-earn",
      createdAt: new Date("2026-10-15T03:00:00.000Z"),
    });
    await testPrisma.auditLog.create({
      data: {
        actorId: cashier.id,
        action: "REWARD_CREATED",
        entity: "RewardCatalog",
      },
    });

    const earnOnly = await getAuditLogEntries(
      parseAuditLogFilters({ aksi: "EARN" }),
      1,
    );
    const adminOnly = await getAuditLogEntries(
      parseAuditLogFilters({ aksi: "REWARD_CREATED" }),
      1,
    );

    expect(earnOnly.total).toBe(1);
    expect(earnOnly.entries[0]?.source).toBe("POINT");
    expect(adminOnly.total).toBe(1);
    expect(adminOnly.entries[0]?.source).toBe("ADMIN");
  });

  it("memfilter berdasarkan pelaku pada kedua sumber", async () => {
    const outlet = await createOutlet();
    const cashierA = await createCashier(outlet.id);
    const cashierB = await createCashier(outlet.id);
    const customer = await createCustomer({ username: "pelanggan.pelaku" });

    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashierA.id,
      outletId: outlet.id,
      idempotencyKey: "audit-pelaku-a",
      createdAt: new Date("2026-10-15T03:00:00.000Z"),
    });
    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashierB.id,
      outletId: outlet.id,
      idempotencyKey: "audit-pelaku-b",
      createdAt: new Date("2026-10-15T03:20:00.000Z"),
    });

    const result = await getAuditLogEntries(
      parseAuditLogFilters({ pelaku: cashierA.id }),
      1,
    );

    expect(result.total).toBe(1);
    expect(result.entries[0]?.actorId).toBe(cashierA.id);
  });

  it("memfilter berdasarkan rentang tanggal WITA", async () => {
    const outlet = await createOutlet();
    const cashier = await createCashier(outlet.id);
    const customer = await createCustomer({ username: "pelanggan.tanggal" });

    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outlet.id,
      idempotencyKey: "audit-hari-ini",
      createdAt: new Date("2026-10-15T03:00:00.000Z"),
    });
    await createEarnTransaction({
      customerId: customer.id,
      cashierId: cashier.id,
      outletId: outlet.id,
      idempotencyKey: "audit-hari-lalu",
      createdAt: new Date("2026-10-14T03:00:00.000Z"),
    });

    const result = await getAuditLogEntries(
      parseAuditLogFilters({ dari: "2026-10-15", sampai: "2026-10-15" }),
      1,
    );

    expect(result.total).toBe(1);
    expect(result.entries[0]?.createdAt.toISOString()).toBe(
      "2026-10-15T03:00:00.000Z",
    );
  });
});
