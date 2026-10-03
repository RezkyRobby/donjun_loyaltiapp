import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  homeForRole,
  isApiRoute,
  isAuthRoute,
  isUserRole,
  matchRoute,
} from "@/lib/rbac";
import {
  evaluateStaffSession,
  isStaffRole,
  STAFF_ACTIVITY_COOKIE,
  STAFF_ACTIVITY_MAX_AGE_SECONDS,
  STAFF_ACTIVITY_REFRESH_MS,
} from "@/lib/session-policy";

// Proxy selalu berjalan di runtime Node.js (Next.js 16), sehingga dapat membaca
// sesi terbaru dari database — akurat untuk perubahan peran maupun penonaktifan
// akun, bukan sekadar keberadaan cookie.
async function readSession(request: NextRequest) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    // Database tidak dapat dijangkau: perlakukan sebagai tamu agar rute
    // terlindungi tetap tertutup.
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/masuk", request.url);
  url.searchParams.set(
    "callbackURL",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(url);
}

function forbidden() {
  return NextResponse.json(
    { message: "Anda tidak memiliki akses ke halaman ini." },
    { status: 403 },
  );
}

// Mengakhiri sesi staf yang kedaluwarsa: mencabut sesi di database, membersihkan
// cookie, lalu mengarahkan ke halaman masuk (atau 401 untuk rute API).
async function endStaffSession(request: NextRequest) {
  const response = isApiRoute(request.nextUrl.pathname)
    ? NextResponse.json(
        { message: "Sesi Anda telah berakhir. Silakan masuk kembali." },
        { status: 401 },
      )
    : redirectToLogin(request);

  try {
    const revoked = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
    for (const cookie of revoked.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
  } catch {
    // Sesi mungkin sudah tidak valid; tetap arahkan ke halaman masuk.
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati kueri sesi ke database saat tidak ada cookie sesi (pengunjung
  // anonim) agar halaman publik seperti landing page tidak menanggung latensi
  // round-trip DB (Lighthouse TTFB).
  const hasSessionCookie = getSessionCookie(request) !== null;
  const session = hasSessionCookie ? await readSession(request) : null;
  const role = session && isUserRole(session.user.role) ? session.user.role : null;
  const isAuthenticated = session !== null;

  const now = Date.now();
  const lastActivityAt = Number(
    request.cookies.get(STAFF_ACTIVITY_COOKIE)?.value ?? Number.NaN,
  );
  const needsActivityRefresh =
    !Number.isFinite(lastActivityAt) ||
    now - lastActivityAt > STAFF_ACTIVITY_REFRESH_MS;

  // Batas sesi staf (PRD §9): 12 jam mutlak, dan idle timeout 30 menit untuk
  // kasir pada perangkat bersama.
  if (session && role !== null && isStaffRole(role)) {
    const state = evaluateStaffSession({
      role,
      sessionCreatedAtMs: new Date(session.session.createdAt).getTime(),
      lastActivityAtMs: Number.isFinite(lastActivityAt) ? lastActivityAt : null,
      nowMs: now,
    });

    if (state !== "active") {
      return endStaffSession(request);
    }
  }

  // Menyegarkan penanda aktivitas staf pada respons yang lolos agar idle
  // timeout dapat dihitung pada permintaan berikutnya.
  function passThrough() {
    const response = NextResponse.next();
    if (
      isAuthenticated &&
      role !== null &&
      isStaffRole(role) &&
      needsActivityRefresh
    ) {
      response.cookies.set(STAFF_ACTIVITY_COOKIE, String(now), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: STAFF_ACTIVITY_MAX_AGE_SECONDS,
      });
    }
    return response;
  }

  // Rute autentikasi hanya untuk tamu (PRD Lampiran B).
  if (isAuthRoute(pathname)) {
    return isAuthenticated
      ? NextResponse.redirect(new URL(homeForRole(role), request.url))
      : passThrough();
  }

  // Pengguna yang sudah masuk diarahkan ke beranda perannya (PRD Lampiran B).
  if (pathname === "/") {
    return isAuthenticated
      ? NextResponse.redirect(new URL(homeForRole(role), request.url))
      : passThrough();
  }

  const rule = matchRoute(pathname);

  if (!rule) return passThrough();

  const isApi = isApiRoute(pathname);

  if (!isAuthenticated) {
    if (isApi) {
      return NextResponse.json(
        { message: "Anda harus masuk terlebih dahulu." },
        { status: 401 },
      );
    }
    return redirectToLogin(request);
  }

  if (role === null) return forbidden();

  if (!rule.roles.includes(role)) {
    return isApi
      ? forbidden()
      : NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  return passThrough();
}

export const config = {
  // Hanya berkas statis (berdasarkan ekstensi) yang dikecualikan. Versi
  // sebelumnya mengabaikan setiap path bertitik sehingga rute dinamis seperti
  // `/admin/pelanggan/nama.berkas` dapat melewati pemeriksaan RBAC.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mjs|map|woff|woff2|ttf|otf|txt|xml|json|webmanifest)$).*)",
  ],
};
