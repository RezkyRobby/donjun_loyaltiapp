import { describe, expect, it } from "vitest";

import {
  AUDIT_ADMIN_ACTIONS,
  AUDIT_POINT_ACTIONS,
  buildAuditLogQueryString,
  getAuditActionLabel,
  isAuditLogAction,
  mergeAuditLogEntries,
  parseAuditLogFilters,
  toAuditLogFilterInput,
  type AuditLogEntry,
} from "@/lib/audit-log";

function entry(
  id: string,
  createdAt: string,
  source: AuditLogEntry["source"] = "POINT",
): AuditLogEntry {
  return {
    id,
    source,
    createdAt: new Date(createdAt),
    actionKey: source === "POINT" ? "EARN" : "REWARD_CREATED",
    amount: source === "POINT" ? 1 : null,
    method: null,
    outletId: null,
    outletName: null,
    actorId: null,
    actorName: null,
    customerName: null,
    customerUsername: null,
    voucherCode: null,
    note: null,
    entity: null,
    entityId: null,
    metadata: null,
  };
}

describe("daftar putih aksi audit", () => {
  it("menggabungkan tipe transaksi poin dan aksi administratif", () => {
    expect(AUDIT_POINT_ACTIONS).toEqual(
      expect.arrayContaining(["EARN", "REDEEM", "ADJUST", "REVERSAL"]),
    );
    expect(AUDIT_ADMIN_ACTIONS).toContain("REWARD_CREATED");
    expect(isAuditLogAction("EARN")).toBe(true);
    expect(isAuditLogAction("REWARD_CREATED")).toBe(true);
    expect(isAuditLogAction("HACK")).toBe(false);
  });

  it("memberi label gabungan dan mengembalikan kunci bila tidak dikenal", () => {
    expect(getAuditActionLabel("EARN")).toBe("Injeksi poin");
    expect(getAuditActionLabel("REWARD_CREATED")).toBe("Reward dibuat");
    expect(getAuditActionLabel("TIDAK_DIKENAL")).toBe("TIDAK_DIKENAL");
  });
});

describe("parseAuditLogFilters", () => {
  it("menerjemahkan tanggal kalender WITA menjadi instant UTC", () => {
    const filters = parseAuditLogFilters({
      dari: "2026-01-15",
      sampai: "2026-01-15",
    });

    // Awal hari WITA = 16:00 UTC hari sebelumnya; akhir hari inklusif.
    expect(filters.from?.toISOString()).toBe("2026-01-14T16:00:00.000Z");
    expect(filters.to?.toISOString()).toBe("2026-01-15T15:59:59.999Z");
  });

  it("mengabaikan tanggal yang tidak valid", () => {
    const filters = parseAuditLogFilters({
      dari: "2026-02-30",
      sampai: "bukan-tanggal",
    });

    expect(filters.from).toBeNull();
    expect(filters.to).toBeNull();
  });

  it("menerima tipe aksi dari daftar putih dan menolak yang lain", () => {
    expect(parseAuditLogFilters({ aksi: "EARN" }).action).toBe("EARN");
    expect(parseAuditLogFilters({ aksi: "REWARD_CREATED" }).action).toBe(
      "REWARD_CREATED",
    );
    expect(parseAuditLogFilters({ aksi: "DROP TABLE" }).action).toBeNull();
  });

  it("memangkas dan membatasi panjang outlet/pelaku", () => {
    const filters = parseAuditLogFilters({
      outlet: "  outlet-1  ",
      pelaku: "a".repeat(80),
    });

    expect(filters.outletId).toBe("outlet-1");
    expect(filters.actorId).toBeNull();
  });
});

describe("toAuditLogFilterInput & buildAuditLogQueryString", () => {
  it("mengembalikan nilai filter untuk form", () => {
    const filters = parseAuditLogFilters({
      dari: "2026-01-15",
      outlet: "outlet-1",
      aksi: "EARN",
    });

    expect(toAuditLogFilterInput(filters)).toEqual({
      from: "2026-01-15",
      to: "",
      outletId: "outlet-1",
      actorId: "",
      action: "EARN",
    });
  });

  it("membangun query string dari filter", () => {
    const filters = parseAuditLogFilters({
      dari: "2026-01-15",
      sampai: "2026-01-16",
      outlet: "outlet-1",
      pelaku: "user-1",
      aksi: "REWARD_CREATED",
    });

    expect(buildAuditLogQueryString(filters)).toBe(
      "dari=2026-01-15&sampai=2026-01-16&outlet=outlet-1&pelaku=user-1&aksi=REWARD_CREATED",
    );
  });

  it("menghasilkan query string kosong tanpa filter", () => {
    expect(buildAuditLogQueryString(parseAuditLogFilters({}))).toBe("");
  });
});

describe("mergeAuditLogEntries", () => {
  const points = [
    entry("p1", "2026-10-15T05:00:00.000Z", "POINT"),
    entry("p2", "2026-10-15T03:00:00.000Z", "POINT"),
  ];
  const admins = [
    entry("a1", "2026-10-15T04:00:00.000Z", "ADMIN"),
    entry("a2", "2026-10-15T02:00:00.000Z", "ADMIN"),
  ];

  it("mengurutkan gabungan dua sumber menurun dan memaginasi", () => {
    const pageOne = mergeAuditLogEntries(points, admins, 1, 2);
    const pageTwo = mergeAuditLogEntries(points, admins, 2, 2);

    expect(pageOne.map((item) => item.id)).toEqual(["p1", "a1"]);
    expect(pageTwo.map((item) => item.id)).toEqual(["p2", "a2"]);
  });

  it("memecah seri waktu berdasarkan id menurun", () => {
    const same = [
      entry("b", "2026-10-15T01:00:00.000Z", "POINT"),
      entry("a", "2026-10-15T01:00:00.000Z", "POINT"),
    ];

    expect(mergeAuditLogEntries(same, [], 1, 5).map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("mengembalikan array kosong di luar rentang halaman", () => {
    expect(mergeAuditLogEntries(points, admins, 10, 2)).toEqual([]);
  });
});
