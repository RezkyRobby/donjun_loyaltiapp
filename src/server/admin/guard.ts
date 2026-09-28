import { UserRole } from "@/generated/prisma/enums";
import { getSession } from "@/server/auth/session";

// Guard Super Admin untuk seluruh Server Action area /admin/* (AGENTS.md
// aturan 6: RBAC ditegakkan di middleware dan di setiap action/handler). Proxy
// sudah menutup rute /admin/*; lapisan ini memastikan action tidak dapat
// dipanggil langsung oleh peran lain.
export async function getSuperAdminId(): Promise<string | null> {
  const session = await getSession();

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) return null;

  return session.user.id;
}
