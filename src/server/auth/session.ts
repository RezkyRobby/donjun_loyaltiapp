import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { homeForRole, isUserRole } from "@/lib/rbac";

// Guard sisi server sebagai lapisan kedua setelah proxy (AGENTS.md aturan 6:
// RBAC ditegakkan di middleware dan di setiap action/handler). Layout area
// pelanggan memakainya agar halaman tidak pernah dirender tanpa sesi CUSTOMER.
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireCustomer() {
  const session = await getSession();

  if (!session) {
    redirect(`/masuk?callbackURL=${encodeURIComponent("/dashboard")}`);
  }

  const role = isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CUSTOMER) {
    redirect(homeForRole(role));
  }

  return session;
}

// Guard area admin (PRD Lampiran B: /admin/* hanya untuk SUPER_ADMIN). Layout
// admin memakainya agar halaman backoffice tidak pernah dirender untuk peran
// lain, sejalan dengan penegakan RBAC di proxy (AGENTS.md aturan 6).
export async function requireSuperAdmin() {
  const session = await getSession();

  if (!session) {
    redirect(`/masuk?callbackURL=${encodeURIComponent("/admin")}`);
  }

  const role = isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.SUPER_ADMIN) {
    redirect(homeForRole(role));
  }

  return session;
}

// Guard area kasir (PRD Lampiran B: /kasir/* untuk CASHIER dan SUPER_ADMIN).
// Layout kasir memakainya agar halaman tidak pernah dirender tanpa sesi staf.
export async function requireStaff() {
  const session = await getSession();

  if (!session) {
    redirect(`/masuk?callbackURL=${encodeURIComponent("/kasir/scan")}`);
  }

  const role = isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    redirect(homeForRole(role));
  }

  return session;
}
