import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { isReservedUsername } from "@/constants/reserved-usernames";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  EmailQuotaError,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "@/server/email";

// Aturan username pelanggan (PRD Lampiran A.1): diawali huruf, boleh memuat
// huruf, angka, titik, dan garis bawah, panjang total 8–20 karakter.
// Daftar reserved username divalidasi terpisah lewat skema Zod (Fase 1 Task 8).
const USERNAME_PATTERN = /^[a-z][a-z0-9._]{6,18}[a-z0-9]$/;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Kegagalan pengiriman email tidak boleh menggagalkan respons autentikasi:
// pesan sukses generik tetap ditampilkan agar email tidak dapat dienumerasi
// (PRD §8.2), dan pembuatan akun tidak gagal hanya karena kuota email harian
// habis (PRD §9). Panggilan kuota terperinci disiapkan bagi UI resend
// (checkEmailQuota di Fase 2).
async function deliverQuietly(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (error) {
    if (error instanceof EmailQuotaError) {
      console.warn(`[email] kuota terlampaui: ${error.message}`);
      return;
    }

    console.error("[email] gagal mengirim email transaksional", error);
  }
}

// Instans Better-Auth: email + kata sandi, Google OAuth, plugin username,
// verifikasi email, reset kata sandi, dan tiga peran (PRD §7.1 & §8).
export const auth = betterAuth({
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    // Google OAuth hanya aktif bila kredensial tersedia (PRD Lampiran C).
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    // Akun harus terverifikasi sebelum dapat membuat sesi (PRD §8.1).
    requireEmailVerification: true,
    minPasswordLength: 8,
    // Token reset sekali pakai berlaku 30 menit (PRD §9).
    resetPasswordTokenExpiresIn: 60 * 30,
    // Ganti kata sandi mencabut seluruh sesi lain (PRD §8.2).
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await deliverQuietly(() => sendResetPasswordEmail({ user, url }));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await deliverQuietly(() => sendVerificationEmail({ user, url }));
    },
  },
  user: {
    additionalFields: {
      // Hanya CUSTOMER yang mendaftar mandiri; peran lain diatur Super Admin.
      role: {
        type: "string",
        required: false,
        defaultValue: UserRole.CUSTOMER,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
  rateLimit: {
    // Batas longgar sebagai jaring pengaman umum; login diperketat di bawah.
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      // Login: maksimal 5 percobaan per 15 menit (PRD §9), berlaku juga di
      // lingkungan pengembangan agar perilaku produksi dapat diuji.
      "/sign-in/email": { window: 60 * 15, max: 5 },
      "/sign-in/username": { window: 60 * 15, max: 5 },
      // Registrasi akun: maks 5 akun/jam per IP (PRD §9). Jaring pengaman bagi
      // endpoint Better-Auth bila dipanggil langsung, di samping pembatasan di
      // Server Action registrasi.
      "/sign-up/email": { window: 60 * 60, max: 5 },
      // Cek ketersediaan username: maks 20 permintaan/menit per IP (PRD §9).
      "/is-username-available": { window: 60, max: 20 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Menolak pembuatan sesi untuk akun nonaktif sehingga kasir yang
        // dinonaktifkan atau pelanggan yang di-suspend tidak dapat masuk lagi
        // (PRD §8.6 langkah 4, §8.3). Sesi berjalan sudah dicabut saat aksi
        // penonaktifan dijalankan.
        before: async (session) => {
          const account = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });

          if (account && account.isActive === false) {
            throw APIError.from("FORBIDDEN", {
              message: "Akun Anda sedang dinonaktifkan. Hubungi Super Admin.",
              code: "ACCOUNT_INACTIVE",
            });
          }
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 8,
      maxUsernameLength: 20,
      // Username permanen dan disimpan huruf kecil (PRD §7.1).
      immutableUsername: true,
      displayUsername: false,
      // Validator dijalankan server-side untuk sign-up maupun update-user,
      // termasuk saat Google OAuth melengkapi username. Reserved words wajib
      // ditolak di sini (PRD Lampiran A.2) agar tidak dapat dilewati dengan
      // memanggil endpoint Better-Auth secara langsung.
      usernameValidator: (value) => {
        const normalized = value.toLowerCase();

        return (
          USERNAME_PATTERN.test(normalized) && !isReservedUsername(normalized)
        );
      },
    }),
    // Harus plugin terakhir agar cookie sesi tersimpan dari Server Action.
    nextCookies(),
  ],
  advanced: {
    database: {
      // ID dibuat database lewat @default(cuid()) agar sesuai PRD §7.1.
      generateId: false,
    },
  },
});
