import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/server/email";

// Aturan username pelanggan (PRD Lampiran A.1): diawali huruf, boleh memuat
// huruf, angka, titik, dan garis bawah, panjang total 8–20 karakter.
// Daftar reserved username divalidasi terpisah lewat skema Zod (Fase 1 Task 8).
const USERNAME_PATTERN = /^[a-z][a-z0-9._]{6,18}[a-z0-9]$/;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

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
      await sendResetPasswordEmail({ user, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ user, url });
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
    },
  },
  plugins: [
    username({
      minUsernameLength: 8,
      maxUsernameLength: 20,
      // Username permanen dan disimpan huruf kecil (PRD §7.1).
      immutableUsername: true,
      displayUsername: false,
      usernameValidator: (value) => USERNAME_PATTERN.test(value.toLowerCase()),
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
