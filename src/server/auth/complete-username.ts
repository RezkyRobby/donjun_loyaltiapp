"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  completeUsernameSchema,
  toFieldErrors,
  type CompleteUsernameInput,
} from "@/lib/registration";
import { getSession } from "@/server/auth/session";

// Melengkapi username bagi pengguna Google OAuth yang belum memilikinya
// (PRD §8.1 langkah 5). Validasi Zod + reserved words dijalankan di server,
// lalu diteruskan ke Better-Auth yang menegakkan immutable username.
export type CompleteUsernameResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export async function completeCustomerUsername(
  input: CompleteUsernameInput,
): Promise<CompleteUsernameResult> {
  const session = await getSession();

  if (!session) {
    return { ok: false, message: "Sesi Anda telah berakhir. Silakan masuk kembali." };
  }

  const parsed = completeUsernameSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { username } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existing && existing.id !== session.user.id) {
    return { ok: false, fieldErrors: { username: "Username sudah digunakan." } };
  }

  try {
    await auth.api.updateUser({
      body: { username },
      headers: await headers(),
    });
  } catch (error) {
    const code = (error as { body?: { code?: string } })?.body?.code;

    switch (code) {
      case "USERNAME_IS_ALREADY_TAKEN":
        return {
          ok: false,
          fieldErrors: { username: "Username sudah digunakan." },
        };
      case "USERNAME_IS_IMMUTABLE":
        return {
          ok: false,
          message: "Username sudah pernah ditetapkan dan tidak dapat diubah.",
        };
      case "INVALID_USERNAME":
      case "USERNAME_TOO_SHORT":
      case "USERNAME_TOO_LONG":
        return {
          ok: false,
          fieldErrors: {
            username:
              "Username mengandung kata yang tidak diizinkan atau formatnya tidak valid.",
          },
        };
      default:
        return { ok: false, message: "Gagal menyimpan username. Coba lagi." };
    }
  }

  return { ok: true };
}
