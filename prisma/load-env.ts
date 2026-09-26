import { config } from "dotenv";

// Prisma 7 dan skrip mandiri tidak memuat berkas .env secara otomatis
// (AGENTS.md: .env.example disalin menjadi .env.local saat development).
config({ path: [".env.local", ".env"] });
