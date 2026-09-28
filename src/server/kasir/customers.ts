import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Identitas pelanggan yang boleh dilihat kasir (PRD §10: hanya nama &
// username). `isActive` ikut dikirim agar UI dapat memperingatkan akun yang
// ditangguhkan sebelum injeksi ditolak di server (PRD §8.3).
export type CashierCustomer = {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
};

// Username disimpan huruf kecil (PRD §7.1) sehingga pencarian tidak
// case-sensitive. Hanya akun berperan CUSTOMER yang dikembalikan; email dan
// nomor telepon tidak pernah masuk ke hasil.
export async function findCustomerByUsername(
  username: string,
): Promise<CashierCustomer | null> {
  const customer = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      name: true,
      username: true,
      isActive: true,
      role: true,
    },
  });

  if (customer?.role !== UserRole.CUSTOMER || !customer.username) return null;

  return {
    id: customer.id,
    name: customer.name,
    username: customer.username,
    isActive: customer.isActive,
  };
}
