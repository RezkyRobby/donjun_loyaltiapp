import { UserRole } from "@/generated/prisma/enums";
import {
  CUSTOMER_SEARCH_LIMIT,
  escapeLikePattern,
} from "@/lib/customer-search";
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

// Pencarian awalan username untuk input manual kasir (PRD §5.2 fitur 2).
// Wildcard SQL (`%`, `_`) di dalam kueri kasir diloloskan lebih dulu agar hanya
// cocok secara harfiah (AGENTS.md aturan 2); nilai tetap dikirim sebagai
// parameter lewat tagged template `$queryRaw`. Kolom yang diambil hanya nama
// dan username.
export async function searchCustomersByUsername(
  prefix: string,
): Promise<CashierCustomer[]> {
  const pattern = `${escapeLikePattern(prefix)}%`;

  return prisma.$queryRaw<CashierCustomer[]>`
    SELECT "id", "name", "username", "isActive"
    FROM "User"
    WHERE "role" = 'CUSTOMER'::"UserRole"
      AND "username" IS NOT NULL
      AND "username" ILIKE ${pattern} ESCAPE '\\'
    ORDER BY "username" ASC
    LIMIT ${CUSTOMER_SEARCH_LIMIT}
  `;
}
