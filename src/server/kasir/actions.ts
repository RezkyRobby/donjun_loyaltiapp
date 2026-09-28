"use server";

import { UserRole } from "@/generated/prisma/enums";
import { accountQrPayloadSchema, parseAccountQrPayload } from "@/lib/account-qr";
import { isUserRole } from "@/lib/rbac";
import { getSession } from "@/server/auth/session";
import {
  findCustomerByUsername,
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
