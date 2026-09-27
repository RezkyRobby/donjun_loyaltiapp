import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  homeForRole,
  isApiRoute,
  isAuthRoute,
  isUserRole,
  matchRoute,
} from "@/lib/rbac";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await readSession(request);
  const role = session && isUserRole(session.user.role) ? session.user.role : null;
  const isAuthenticated = session !== null;

  // Rute autentikasi hanya untuk tamu (PRD Lampiran B).
  if (isAuthRoute(pathname)) {
    return isAuthenticated
      ? NextResponse.redirect(new URL(homeForRole(role), request.url))
      : NextResponse.next();
  }

  // Pengguna yang sudah masuk diarahkan ke beranda perannya (PRD Lampiran B).
  if (pathname === "/") {
    return isAuthenticated
      ? NextResponse.redirect(new URL(homeForRole(role), request.url))
      : NextResponse.next();
  }

  const rule = matchRoute(pathname);

  if (!rule) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
