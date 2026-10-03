import { UserRole } from "@/generated/prisma/enums";

// Kebijakan umur sesi (PRD §9 Manajemen Sesi). Sesi pelanggan berlaku 30 hari
// dengan penyegaran geser; sesi staf dibatasi 12 jam mutlak, dan perangkat
// kasir bersama menerapkan idle timeout 30 menit.
export const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 30;
export const CUSTOMER_SESSION_REFRESH_SECONDS = 60 * 60 * 24;

export const STAFF_SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const STAFF_IDLE_MS = 30 * 60 * 1000;

// Cookie penanda aktivitas terakhir staf. Umurnya mengikuti batas absolut agar
// nilai kedaluwarsa tetap dapat dibaca saat idle; ambang 30 menit diperiksa
// dari nilai stempel waktu, bukan dari umur cookie.
export const STAFF_ACTIVITY_COOKIE = "donjun_staff_activity";
export const STAFF_ACTIVITY_MAX_AGE_SECONDS = STAFF_SESSION_ABSOLUTE_MS / 1000;
// Hindari penulisan cookie pada setiap permintaan; segarkan tiap menit.
export const STAFF_ACTIVITY_REFRESH_MS = 60 * 1000;

export type StaffSessionState = "active" | "idle-expired" | "absolute-expired";

export function isStaffRole(role: UserRole): boolean {
  return role === UserRole.CASHIER || role === UserRole.SUPER_ADMIN;
}

// Menentukan status sesi staf secara deterministik agar dapat diuji tanpa
// middleware. Idle timeout hanya berlaku untuk kasir karena perangkat kasir
// dipakai bersama (PRD §9).
export function evaluateStaffSession({
  role,
  sessionCreatedAtMs,
  lastActivityAtMs,
  nowMs,
}: {
  role: UserRole;
  sessionCreatedAtMs: number;
  lastActivityAtMs: number | null;
  nowMs: number;
}): StaffSessionState {
  if (nowMs - sessionCreatedAtMs >= STAFF_SESSION_ABSOLUTE_MS) {
    return "absolute-expired";
  }

  if (
    role === UserRole.CASHIER &&
    lastActivityAtMs !== null &&
    nowMs - lastActivityAtMs >= STAFF_IDLE_MS
  ) {
    return "idle-expired";
  }

  return "active";
}
