import { describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/enums";
import {
  CUSTOMER_SESSION_SECONDS,
  evaluateStaffSession,
  isStaffRole,
  STAFF_IDLE_MS,
  STAFF_SESSION_ABSOLUTE_MS,
} from "@/lib/session-policy";

const NOW = new Date("2026-10-03T04:00:00.000Z").getTime();

describe("isStaffRole", () => {
  it("hanya kasir dan super admin yang dianggap staf", () => {
    expect(isStaffRole(UserRole.CASHIER)).toBe(true);
    expect(isStaffRole(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isStaffRole(UserRole.CUSTOMER)).toBe(false);
  });
});

describe("evaluateStaffSession", () => {
  it("sesi pelanggan berlaku 30 hari", () => {
    expect(CUSTOMER_SESSION_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  it("aktif saat baru dibuat dan belum idle", () => {
    expect(
      evaluateStaffSession({
        role: UserRole.CASHIER,
        sessionCreatedAtMs: NOW - 60_000,
        lastActivityAtMs: NOW - 60_000,
        nowMs: NOW,
      }),
    ).toBe("active");
  });

  it("kedaluwarsa mutlak setelah 12 jam untuk semua staf", () => {
    expect(
      evaluateStaffSession({
        role: UserRole.SUPER_ADMIN,
        sessionCreatedAtMs: NOW - STAFF_SESSION_ABSOLUTE_MS,
        lastActivityAtMs: NOW,
        nowMs: NOW,
      }),
    ).toBe("absolute-expired");
  });

  it("idle timeout hanya berlaku untuk kasir", () => {
    expect(
      evaluateStaffSession({
        role: UserRole.CASHIER,
        sessionCreatedAtMs: NOW - 60_000,
        lastActivityAtMs: NOW - STAFF_IDLE_MS,
        nowMs: NOW,
      }),
    ).toBe("idle-expired");

    expect(
      evaluateStaffSession({
        role: UserRole.SUPER_ADMIN,
        sessionCreatedAtMs: NOW - 60_000,
        lastActivityAtMs: NOW - STAFF_IDLE_MS,
        nowMs: NOW,
      }),
    ).toBe("active");
  });

  it("sesi baru tanpa penanda aktivitas dianggap aktif", () => {
    expect(
      evaluateStaffSession({
        role: UserRole.CASHIER,
        sessionCreatedAtMs: NOW,
        lastActivityAtMs: null,
        nowMs: NOW,
      }),
    ).toBe("active");
  });
});
