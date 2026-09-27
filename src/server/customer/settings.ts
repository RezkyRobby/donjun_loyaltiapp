"use server";

import { headers } from "next/headers";

import { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone, toFieldErrors } from "@/lib/registration";
import {
  changePasswordSchema,
  profileUpdateSchema,
  type ChangePasswordInput,
  type ProfileUpdateInput,
} from "@/lib/settings";
import { getSession } from "@/server/auth/session";

// Server Action pengaturan akun pelanggan (PRD §5.1 fitur 7). Username dan email
// permanen; hanya nama, nomor telepon, dan kata sandi yang dapat diubah.
// Validasi Zod dijalankan ulang di server (AGENTS.md aturan 1).
export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

async function requireCustomerId(): Promise<string | null> {
  const session = await getSession();

  if (!session || session.user.role !== UserRole.CUSTOMER) return null;

  return session.user.id;
}

export async function updateCustomerProfile(
  input: ProfileUpdateInput,
): Promise<SettingsResult> {
  const userId = await requireCustomerId();

  if (!userId) {
    return {
      ok: false,
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const parsed = profileUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data yang Anda isi.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name } = parsed.data;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  if (phone) {
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existing && existing.id !== userId) {
      return {
        ok: false,
        message: "Nomor telepon sudah dipakai akun lain.",
        fieldErrors: { phone: "Nomor telepon sudah dipakai akun lain." },
      };
    }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name, phone },
    });
  } catch {
    return { ok: false, message: "Gagal menyimpan perubahan. Coba lagi." };
  }

  return { ok: true, message: "Data akun berhasil diperbarui." };
}

export async function changeCustomerPassword(
  input: ChangePasswordInput,
): Promise<SettingsResult> {
  const userId = await requireCustomerId();

  if (!userId) {
    return {
      ok: false,
      message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali kata sandi yang Anda isi.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Ganti kata sandi mencabut seluruh sesi lain (PRD §9).
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    const code = (error as { body?: { code?: string } })?.body?.code;

    switch (code) {
      case "INVALID_PASSWORD":
        return {
          ok: false,
          fieldErrors: { currentPassword: "Kata sandi saat ini salah." },
        };
      case "PASSWORD_TOO_SHORT":
      case "PASSWORD_TOO_LONG":
        return {
          ok: false,
          fieldErrors: { newPassword: "Kata sandi minimal 8 karakter." },
        };
      case "SESSION_EXPIRED":
        return {
          ok: false,
          message:
            "Sesi Anda sudah lama. Masuk kembali lalu ubah kata sandi Anda.",
        };
      case "CREDENTIAL_ACCOUNT_NOT_FOUND":
        return {
          ok: false,
          message: "Akun ini tidak memiliki kata sandi untuk diubah.",
        };
      default:
        return { ok: false, message: "Gagal mengubah kata sandi. Coba lagi." };
    }
  }

  return {
    ok: true,
    message:
      "Kata sandi berhasil diubah. Sesi di perangkat lain telah dicabut.",
  };
}
