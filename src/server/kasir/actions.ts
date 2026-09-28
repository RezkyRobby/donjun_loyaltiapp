"use server";

import { UserRole } from "@/generated/prisma/enums";
import { accountQrPayloadSchema, parseAccountQrPayload } from "@/lib/account-qr";
import {
  customerSearchQuerySchema,
  normalizeCustomerSearchQuery,
} from "@/lib/customer-search";
import { isUserRole } from "@/lib/rbac";
import { getSession } from "@/server/auth/session";
import {
  findCustomerByUsername,
  searchCustomersByUsername,
  type CashierCustomer,
} from "@/server/kasir/customers";

export type ScanCustomerResult =
  | { status: "FOUND"; customer: CashierCustomer }
  | { status: "INVALID_QR" }
  | { status: "NOT_FOUND" }
  | { status: "UNAUTHORIZED" };

// Identifikasi pelanggan dari payload QR (PRD §5.2 fitur 1, §8.3). Validasi
// dilakukan ulang di server — versi payload wajib dikenali dan username wajib
// valid — sehingga QR asing tidak pernah menyentuh database (AGENTS.md aturan 1).
export async function scanCustomerQrAction(
  payload: unknown,
): Promise<ScanCustomerResult> {
  const session = await getSession();
  const role =
    session && isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    return { status: "UNAUTHORIZED" };
  }

  const parsed = accountQrPayloadSchema.safeParse(payload);
  if (!parsed.success) return { status: "INVALID_QR" };

  const qr = parseAccountQrPayload(parsed.data);
  if (!qr.valid) return { status: "INVALID_QR" };

  const customer = await findCustomerByUsername(qr.username);
  if (!customer) return { status: "NOT_FOUND" };

  return { status: "FOUND", customer };
}

export type SearchCustomersResult =
  | { status: "OK"; customers: CashierCustomer[] }
  | { status: "INVALID" }
  | { status: "UNAUTHORIZED" };

// Pencarian awalan username untuk input manual kasir (PRD §5.2 fitur 2).
// Kueri dinormalkan lebih dulu, lalu divalidasi (minimal 3 karakter dan
// charset username) sebelum menyentuh database.
export async function searchCustomersByUsernameAction(
  prefix: unknown,
): Promise<SearchCustomersResult> {
  const session = await getSession();
  const role =
    session && isUserRole(session.user.role) ? session.user.role : null;

  if (role !== UserRole.CASHIER && role !== UserRole.SUPER_ADMIN) {
    return { status: "UNAUTHORIZED" };
  }

  if (typeof prefix !== "string") return { status: "INVALID" };

  const parsed = customerSearchQuerySchema.safeParse(
    normalizeCustomerSearchQuery(prefix),
  );
  if (!parsed.success) return { status: "INVALID" };

  const customers = await searchCustomersByUsername(parsed.data);

  return { status: "OK", customers };
}
