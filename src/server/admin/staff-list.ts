import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Kueri daftar staf kasir untuk backoffice (PRD §5.3 fitur 4). `activated`
// menandai apakah kasir sudah menetapkan kata sandi (memiliki akun kredensial
// Better-Auth); bila belum, undangan aktivasi masih menunggu.
export type AdminStaff = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  outletId: string | null;
  outletName: string | null;
  activated: boolean;
};

export async function getAdminStaffList(): Promise<AdminStaff[]> {
  const rows = await prisma.user.findMany({
    where: { role: UserRole.CASHIER },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      outletId: true,
      outlet: { select: { name: true } },
      // Kehadiran akun kredensial menandakan kasir sudah mengaktifkan akun.
      accounts: {
        where: { providerId: "credential" },
        select: { id: true },
        take: 1,
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    isActive: row.isActive,
    outletId: row.outletId,
    outletName: row.outlet?.name ?? null,
    activated: row.accounts.length > 0,
  }));
}
