import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 tidak memuat berkas .env secara otomatis (lihat AGENTS.md: .env.example disalin ke .env.local).
// url dibiarkan opsional agar `prisma generate` (postinstall) berjalan tanpa kredensial database.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
