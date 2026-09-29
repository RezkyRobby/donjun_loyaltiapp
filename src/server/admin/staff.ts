"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTION, AUDIT_ENTITY } from "@/constants/audit";
import { UserRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toFieldErrors } from "@/lib/registration";
import {
  buildStaffActivationUrl,
  outletIdSchema,
  staffCreateSchema,
  staffIdSchema,
  STAFF_INVITATION_TTL_MS,
  STAFF_RESET_TTL_MS,
  type StaffCreateInput,
} from "@/lib/staff-admin";
import { recordAuditLog } from "@/server/admin/audit";
import { getSuperAdminId } from "@/server/admin/guard";
import {
  EmailQuotaError,
  sendResetPasswordEmail,
  sendStaffInvitationEmail,
} from "@/server/email";

// Server Action manajemen akun staf kasir (PRD §5.3 fitur 4, §8.6). Hanya
// Super Admin yang boleh memanggil; akun yang dikelola selalu berperan CASHIER
// (SUPER_ADMIN hanya via seeder). Undangan aktivasi dan reset kredensial memakai
// token sekali pakai yang dicocokkan Better-Auth pada halaman /reset-sandi,
// sehingga kasir menetapkan kata sandinya sendiri. Setiap mutasi menulis
// AuditLog (AGENTS.md aturan 9).

export type StaffActionResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const RESET_TOKEN_PREFIX = "reset-password:";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function emailFailureMessage(error: unknown): string {
  if (error instanceof EmailQuotaError) return error.message;

  console.error("[staf] gagal mengirim email", error);

  return "Email gagal dikirim. Coba lagi sebentar lagi.";
}

function isUniqueEmailError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createStaff(
  input: StaffCreateInput,
): Promise<StaffActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const parsed = staffCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data staf.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, email, outletId } = parsed.data;

  const [existingEmail, outlet] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, name: true },
    }),
  ]);

  if (existingEmail) {
    return {
      ok: false,
      message: "Email sudah terdaftar. Satu email hanya untuk satu akun.",
      fieldErrors: { email: "Email sudah terdaftar." },
    };
  }

  if (!outlet) {
    return {
      ok: false,
      message: "Outlet tidak ditemukan.",
      fieldErrors: { outletId: "Outlet tidak ditemukan." },
    };
  }

  const token = generateToken();

  try {
    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          role: UserRole.CASHIER,
          // Email disetujui lewat pengiriman undangan; akun menunggu kata sandi.
          emailVerified: true,
          isActive: true,
          outletId,
        },
        select: { id: true, name: true, email: true },
      });

      await tx.verification.create({
        data: {
          identifier: `${RESET_TOKEN_PREFIX}${token}`,
          value: created.id,
          expiresAt: new Date(Date.now() + STAFF_INVITATION_TTL_MS),
        },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.STAFF_CREATED,
        entity: AUDIT_ENTITY.USER,
        entityId: created.id,
        metadata: { name, email, outletId, outletName: outlet.name },
      });

      return created;
    });

    let warning: string | null = null;

    try {
      await sendStaffInvitationEmail({
        user: { name: staff.name, email: staff.email },
        url: buildStaffActivationUrl(appUrl(), token),
        outletName: outlet.name,
      });
    } catch (error) {
      warning = `${emailFailureMessage(error)} Gunakan tombol "Kirim ulang undangan" untuk mengirim ulang.`;
    }

    revalidatePath("/admin/staf");

    return {
      ok: true,
      id: staff.id,
      message:
        warning ??
        `Akun kasir dibuat dan undangan aktivasi dikirim ke ${staff.email}.`,
    };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return {
        ok: false,
        message: "Email sudah terdaftar. Satu email hanya untuk satu akun.",
        fieldErrors: { email: "Email sudah terdaftar." },
      };
    }

    console.error("[staf] gagal membuat akun staf", error);

    return { ok: false, message: "Gagal membuat akun staf. Coba lagi." };
  }
}

// Data kasir + status aktivasi yang dibutuhkan aksi berikutnya.
async function findCashier(id: string) {
  return prisma.user.findFirst({
    where: { id, role: UserRole.CASHIER },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      outletId: true,
      outlet: { select: { name: true } },
      accounts: {
        where: { providerId: "credential" },
        select: { id: true },
        take: 1,
      },
    },
  });
}

export async function resendStaffInvitation(
  id: string,
): Promise<StaffActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = staffIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Staf tidak valid." };
  }

  const staff = await findCashier(idParsed.data);

  if (!staff) {
    return { ok: false, message: "Staf tidak ditemukan." };
  }

  if (staff.accounts.length > 0) {
    return {
      ok: false,
      message:
        "Akun kasir sudah aktif. Gunakan tombol kirim tautan reset bila kasir lupa kata sandi.",
    };
  }

  const token = generateToken();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.verification.deleteMany({
        where: {
          value: staff.id,
          identifier: { startsWith: RESET_TOKEN_PREFIX },
        },
      });
      await tx.verification.create({
        data: {
          identifier: `${RESET_TOKEN_PREFIX}${token}`,
          value: staff.id,
          expiresAt: new Date(Date.now() + STAFF_INVITATION_TTL_MS),
        },
      });
      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.STAFF_INVITED,
        entity: AUDIT_ENTITY.USER,
        entityId: staff.id,
        metadata: { email: staff.email },
      });
    });

    await sendStaffInvitationEmail({
      user: { name: staff.name, email: staff.email },
      url: buildStaffActivationUrl(appUrl(), token),
      outletName: staff.outlet?.name,
    });
  } catch (error) {
    return { ok: false, message: emailFailureMessage(error) };
  }

  revalidatePath("/admin/staf");

  return {
    ok: true,
    id: staff.id,
    message: `Undangan aktivasi dikirim ulang ke ${staff.email}.`,
  };
}

export async function sendStaffCredentialsReset(
  id: string,
): Promise<StaffActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = staffIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Staf tidak valid." };
  }

  const staff = await findCashier(idParsed.data);

  if (!staff) {
    return { ok: false, message: "Staf tidak ditemukan." };
  }

  const token = generateToken();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.verification.deleteMany({
        where: {
          value: staff.id,
          identifier: { startsWith: RESET_TOKEN_PREFIX },
        },
      });
      await tx.verification.create({
        data: {
          identifier: `${RESET_TOKEN_PREFIX}${token}`,
          value: staff.id,
          expiresAt: new Date(Date.now() + STAFF_RESET_TTL_MS),
        },
      });
      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.STAFF_CREDENTIALS_RESET,
        entity: AUDIT_ENTITY.USER,
        entityId: staff.id,
        metadata: { email: staff.email },
      });
    });

    await sendResetPasswordEmail({
      user: { name: staff.name, email: staff.email },
      url: buildStaffActivationUrl(appUrl(), token),
    });
  } catch (error) {
    return { ok: false, message: emailFailureMessage(error) };
  }

  revalidatePath("/admin/staf");

  return {
    ok: true,
    id: staff.id,
    message: `Tautan reset kata sandi dikirim ke ${staff.email}.`,
  };
}

export async function moveStaffOutlet(
  id: string,
  outletId: string,
): Promise<StaffActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = staffIdSchema.safeParse(id);
  const outletParsed = outletIdSchema.safeParse(outletId);

  if (!idParsed.success) {
    return { ok: false, message: "Staf tidak valid." };
  }

  if (!outletParsed.success) {
    return { ok: false, message: "Outlet tidak valid." };
  }

  const [staff, outlet] = await Promise.all([
    findCashier(idParsed.data),
    prisma.outlet.findUnique({
      where: { id: outletParsed.data },
      select: { id: true, name: true },
    }),
  ]);

  if (!staff) {
    return { ok: false, message: "Staf tidak ditemukan." };
  }

  if (!outlet) {
    return { ok: false, message: "Outlet tidak ditemukan." };
  }

  if (staff.outletId === outlet.id) {
    return { ok: true, id: staff.id, message: "Outlet staf tidak berubah." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.id },
        data: { outletId: outlet.id },
      });

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.STAFF_UPDATED,
        entity: AUDIT_ENTITY.USER,
        entityId: staff.id,
        metadata: {
          change: "OUTLET",
          previousOutletId: staff.outletId,
          outletId: outlet.id,
          outletName: outlet.name,
        },
      });
    });
  } catch (error) {
    console.error("[staf] gagal memindahkan outlet staf", error);

    return { ok: false, message: "Gagal memindahkan outlet. Coba lagi." };
  }

  revalidatePath("/admin/staf");

  return {
    ok: true,
    id: staff.id,
    message: `Staf dipindahkan ke ${outlet.name}.`,
  };
}

export async function setStaffActive(
  id: string,
  isActive: boolean,
): Promise<StaffActionResult> {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return { ok: false, message: "Aksi ini hanya dapat dilakukan Super Admin." };
  }

  const idParsed = staffIdSchema.safeParse(id);

  if (!idParsed.success) {
    return { ok: false, message: "Staf tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.user.findFirst({
        where: { id: idParsed.data, role: UserRole.CASHIER },
        select: { id: true, isActive: true },
      });

      if (!staff) return null;
      if (staff.isActive === isActive) return { id: staff.id, revoked: 0 };

      await tx.user.update({
        where: { id: staff.id },
        data: { isActive },
      });

      // Penonaktifan mencabut seluruh sesi berjalan seketika (PRD §8.6 langkah 4).
      let revoked = 0;
      if (!isActive) {
        const deleted = await tx.session.deleteMany({
          where: { userId: staff.id },
        });
        revoked = deleted.count;
      }

      await recordAuditLog(tx, {
        actorId,
        action: AUDIT_ACTION.STAFF_UPDATED,
        entity: AUDIT_ENTITY.USER,
        entityId: staff.id,
        metadata: { change: "STATUS", isActive, revokedSessions: revoked },
      });

      return { id: staff.id, revoked };
    });

    if (!result) {
      return { ok: false, message: "Staf tidak ditemukan." };
    }

    revalidatePath("/admin/staf");

    return {
      ok: true,
      id: result.id,
      message: isActive
        ? "Staf diaktifkan kembali."
        : "Staf dinonaktifkan dan seluruh sesinya dicabut.",
    };
  } catch (error) {
    console.error("[staf] gagal mengubah status staf", error);

    return { ok: false, message: "Gagal mengubah status staf. Coba lagi." };
  }
}
