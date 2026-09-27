import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Semua endpoint Better-Auth berada di bawah /api/auth/* (PRD Lampiran B).
export const { GET, POST } = toNextJsHandler(auth);
