import { config } from "dotenv";

// Setup global Vitest. Memuat variabel lokal lalu mengarahkan Prisma ke basis
// data uji. Bila TEST_DATABASE_URL tidak diisi, nilai placeholder dipakai hanya
// agar impor modul tidak gagal saat evaluasi berkas uji; uji integrasi
// di-skip (lihat tests/support/harness.ts) sehingga `pnpm test` tetap hijau.
config({ path: [".env.test.local", ".env.local", ".env"], quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

process.env.DATABASE_URL =
  testDatabaseUrl || "postgresql://donjun:donjun@localhost:5432/donjun_test";
