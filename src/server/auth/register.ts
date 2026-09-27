"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  normalizePhone,
  registrationSchema,
  toFieldErrors,
  type RegistrationInput,
} from "@/lib/registration";

// Server Action registrasi pelanggan (PRD §8.1). Validasi Zod dijalankan ulang
// di server (AGENTS.md aturan 1), ditambah rate limit dan pengecekan keunikan
// awal untuk pesan yang spesifik. Unique constraint database tetap menjadi
// penentu akhir saat pembuatan akun.
export type RegisterResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const registrationLimiter = createRateLimiter(RATE_LIMITS.registration);

function clientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");

  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  return headerList.get("x-real-ip") ?? "unknown";
}

function mapSignUpError(error: unknown): string {
  const code = (error as { body?: { code?: string } })?.body?.code;

  switch (code) {
    case "USERNAME_IS_ALREADY_TAKEN":
      return "Username sudah digunakan. Silakan pilih username lain.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Email sudah terdaftar. Silakan masuk menggunakan email tersebut.";
    default:
      return "Pendaftaran gagal. Coba lagi sebentar lagi atau hubungi admin bila masalah berlanjut.";
  }
}

export async function registerCustomer(
  input: RegistrationInput,
): Promise<RegisterResult> {
  const headerList = await headers();
  const decision = registrationLimiter.consume(clientIp(headerList));

  if (!decision.allowed) {
    const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));

    return {
      ok: false,
      message: `Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam ${minutes} menit.`,
    };
  }

  const parsed = registrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali data yang Anda isi.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, email, username, password } = parsed.data;
  const phone = parsed.data.phone
    ? normalizePhone(parsed.data.phone)
    : undefined;

  const [existingEmail, existingUsername, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    phone
      ? prisma.user.findUnique({ where: { phone }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (existingEmail) {
    return {
      ok: false,
      message: "Email sudah terdaftar. Silakan masuk menggunakan email tersebut.",
      fieldErrors: { email: "Email sudah terdaftar." },
    };
  }

  if (existingUsername) {
    return {
      ok: false,
      message: "Username sudah digunakan. Silakan pilih username lain.",
      fieldErrors: { username: "Username sudah digunakan." },
    };
  }

  if (existingPhone) {
    return {
      ok: false,
      message:
        "Nomor telepon sudah dipakai akun lain. Hubungi admin bila ini keliru.",
      fieldErrors: { phone: "Nomor telepon sudah dipakai akun lain." },
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        username,
        ...(phone ? { phone } : {}),
        // Setelah verifikasi berhasil, pengguna diarahkan ke halaman verifikasi
        // yang otomatis memindahkannya ke dashboard (proxy).
        callbackURL: "/verifikasi-email",
      },
    });
  } catch (error) {
    return { ok: false, message: mapSignUpError(error) };
  }

  return {
    ok: true,
    message:
      "Akun berhasil dibuat. Kami telah mengirim tautan verifikasi ke email Anda.",
  };
}
