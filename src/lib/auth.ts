import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

// Instans Better-Auth. Konfigurasi lengkap (Google OAuth, plugin username,
// verifikasi email, reset kata sandi) dilengkapi pada task autentikasi.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      // ID dibuat database lewat @default(cuid()) agar sesuai PRD §7.1.
      generateId: false,
    },
  },
});
