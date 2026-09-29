import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_ACTION } from "@/constants/audit";
import {
  PointTransactionType,
  UserRole,
} from "@/generated/prisma/enums";
import { setCustomerActive } from "@/server/admin/customers";
import { deleteOutlet } from "@/server/admin/outlets";
import { adjustCustomerPoints } from "@/server/admin/points";

import {
  createCashier,
  createCustomer,
  createOutlet,
  hasTestDatabase,
  resetDatabase,
  testPrisma,
} from "../support/harness";
import { setSession } from "../support/session";

// Manajemen pelanggan & outlet diuji terhadap basis data uji: penangguhan akun
// mencabut sesi, koreksi saldo (`ADJUST`) tidak boleh membuat saldo negatif, dan
// outlet yang terpakai tidak boleh dihapus (PRD §5.3 fitur 5–6, §8.5).
vi.mock("@/server/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

async function createSuperAdmin() {
  return testPrisma.user.create({
    data: {
      email: `admin-${randomUUID()}@uji.local`,
      name: "Super Admin Uji",
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });
}

describe.skipIf(!hasTestDatabase)("integrasi manajemen pelanggan & outlet", () => {
  let adminId: string;

  beforeEach(async () => {
    await resetDatabase();

    const admin = await createSuperAdmin();
    adminId = admin.id;
    setSession({ id: adminId, role: UserRole.SUPER_ADMIN });
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("menangguhkan pelanggan, mencabut sesi, dan mencatat audit", async () => {
    const customer = await createCustomer({ username: "pelanggan.suspend" });
    await testPrisma.session.create({
      data: {
        userId: customer.id,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const result = await setCustomerActive(customer.id, false);

    expect(result.ok).toBe(true);

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { isActive: true },
    });
    expect(updated.isActive).toBe(false);
    expect(
      await testPrisma.session.count({ where: { userId: customer.id } }),
    ).toBe(0);

    const audit = await testPrisma.auditLog.findFirst({
      where: {
        entityId: customer.id,
        action: AUDIT_ACTION.CUSTOMER_SUSPENDED,
      },
    });
    expect(audit).not.toBeNull();
  });

  it("mengaktifkan kembali pelanggan yang ditangguhkan", async () => {
    const customer = await createCustomer({
      username: "pelanggan.aktif",
      isActive: false,
    });

    const result = await setCustomerActive(customer.id, true);

    expect(result.ok).toBe(true);

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { isActive: true },
    });
    expect(updated.isActive).toBe(true);
  });

  it("mencatat koreksi saldo positif sebagai ADJUST dengan catatan", async () => {
    const customer = await createCustomer({
      username: "pelanggan.koreksi",
      pointsBalance: 10,
    });

    const result = await adjustCustomerPoints({
      username: "pelanggan.koreksi",
      amount: 5,
      note: "Koreksi injeksi ganda",
    });

    expect(result.ok).toBe(true);

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { pointsBalance: true },
    });
    expect(updated.pointsBalance).toBe(15);

    const transaction = await testPrisma.pointTransaction.findFirst({
      where: { customerId: customer.id, type: PointTransactionType.ADJUST },
    });
    expect(transaction?.amount).toBe(5);
    expect(transaction?.note).toBe("Koreksi injeksi ganda");
  });

  it("menolak koreksi negatif yang melebihi saldo tanpa mengubah saldo", async () => {
    const customer = await createCustomer({
      username: "pelanggan.minus",
      pointsBalance: 3,
    });

    const result = await adjustCustomerPoints({
      username: "pelanggan.minus",
      amount: -5,
      note: "Koreksi berlebihan",
    });

    expect(result.ok).toBe(false);

    const updated = await testPrisma.user.findUniqueOrThrow({
      where: { id: customer.id },
      select: { pointsBalance: true },
    });
    expect(updated.pointsBalance).toBe(3);
  });

  it("menolak hapus outlet yang masih memiliki kasir", async () => {
    const outlet = await createOutlet();
    await createCashier(outlet.id);

    const result = await deleteOutlet(outlet.id);

    expect(result.ok).toBe(false);
    expect(await testPrisma.outlet.count({ where: { id: outlet.id } })).toBe(1);
  });

  it("menghapus outlet yang belum terpakai dan mencatat audit", async () => {
    const outlet = await createOutlet("Outlet Kosong");

    const result = await deleteOutlet(outlet.id);

    expect(result.ok).toBe(true);
    expect(await testPrisma.outlet.count({ where: { id: outlet.id } })).toBe(0);

    const audit = await testPrisma.auditLog.findFirst({
      where: { entityId: outlet.id, action: AUDIT_ACTION.OUTLET_DELETED },
    });
    expect(audit).not.toBeNull();
  });
});
