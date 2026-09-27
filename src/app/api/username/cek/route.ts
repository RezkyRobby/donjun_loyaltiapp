import { NextResponse, type NextRequest } from "next/server";

import { isReservedUsername } from "@/constants/reserved-usernames";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, RATE_LIMITS } from "@/lib/rate-limit";
import { isValidUsernameFormat, normalizeUsername } from "@/lib/username";

// Endpoint khusus cek ketersediaan username (PRD Lampiran A.3). Dipanggil
// dengan debounce ±400 ms dari klien. Dibatasi 20 permintaan/menit per IP
// (PRD §9) dan tetap divalidasi ulang saat submit pendaftaran.
export const dynamic = "force-dynamic";

const limiter = createRateLimiter(RATE_LIMITS.usernameCheck);

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(request: NextRequest) {
  const decision = limiter.consume(clientIp(request));

  if (!decision.allowed) {
    return NextResponse.json(
      {
        available: false,
        message: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(decision.retryAfterSeconds) },
      },
    );
  }

  const username = normalizeUsername(
    request.nextUrl.searchParams.get("username") ?? "",
  );

  if (!username) {
    return NextResponse.json({
      available: false,
      message: "Masukkan username terlebih dahulu.",
    });
  }

  if (!isValidUsernameFormat(username)) {
    return NextResponse.json({
      available: false,
      message:
        "Username 8 sampai 20 karakter, diawali huruf, hanya huruf kecil, angka, titik, atau garis bawah.",
    });
  }

  if (isReservedUsername(username)) {
    return NextResponse.json({
      available: false,
      message: "Username mengandung kata yang tidak diizinkan.",
    });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return NextResponse.json(
      existing
        ? { available: false, message: "Username sudah digunakan." }
        : { available: true, message: "Username tersedia." },
    );
  } catch {
    return NextResponse.json(
      {
        available: false,
        message: "Tidak dapat memeriksa username saat ini. Coba lagi.",
      },
      { status: 503 },
    );
  }
}
