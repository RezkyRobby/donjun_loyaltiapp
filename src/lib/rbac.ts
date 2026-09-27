import { UserRole } from "@/generated/prisma/enums";

// Aturan akses route berbasis peran (PRD Lampiran B). Middleware dan lapisan
// server memakai daftar ini agar tidak ada aturan yang tersebar di banyak file.
type RouteRule = {
  prefix: string;
  roles: UserRole[];
};

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin", roles: [UserRole.SUPER_ADMIN] },
  { prefix: "/api/admin", roles: [UserRole.SUPER_ADMIN] },
  { prefix: "/kasir", roles: [UserRole.CASHIER, UserRole.SUPER_ADMIN] },
  { prefix: "/api/cashier", roles: [UserRole.CASHIER, UserRole.SUPER_ADMIN] },
  { prefix: "/dashboard", roles: [UserRole.CUSTOMER] },
  { prefix: "/promo", roles: [UserRole.CUSTOMER] },
  { prefix: "/voucher", roles: [UserRole.CUSTOMER] },
  { prefix: "/pengaturan", roles: [UserRole.CUSTOMER] },
];

// Hanya untuk tamu; pengguna yang sudah masuk dialihkan ke beranda perannya.
const AUTH_ROUTES = [
  "/masuk",
  "/daftar",
  "/lupa-sandi",
  "/reset-sandi",
  "/verifikasi-email",
];

// Beranda default tiap peran setelah login (PRD Lampiran B).
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: "/dashboard",
  [UserRole.CASHIER]: "/kasir/scan",
  [UserRole.SUPER_ADMIN]: "/admin",
};

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === UserRole.CUSTOMER ||
    value === UserRole.CASHIER ||
    value === UserRole.SUPER_ADMIN
  );
}

export function homeForRole(role: UserRole | null): string {
  return role ? ROLE_HOME[role] : ROLE_HOME[UserRole.CUSTOMER];
}

export function matchRoute(pathname: string): RouteRule | null {
  return (
    ROUTE_RULES.find(
      (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
    ) ?? null
  );
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}
