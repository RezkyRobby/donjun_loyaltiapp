import { describe, expect, it } from "vitest";

import {
  AUDIT_CSV_HEADERS,
  buildAuditCsv,
  buildAuditCsvFilename,
  escapeCsvCell,
  toAuditCsvRow,
} from "@/lib/audit-csv";
import type { AuditLogEntry } from "@/lib/audit-log";

const POINT_ENTRY: AuditLogEntry = {
  id: "pt1",
  source: "POINT",
  createdAt: new Date("2026-10-15T04:00:00.000Z"),
  actionKey: "EARN",
  amount: 1,
  method: "USERNAME",
  outletId: "outlet-1",
  outletName: "Donjun Donat Gowa",
  actorId: "cashier-1",
  actorName: 'Kasir "Satu"',
  customerName: "Budi Santoso",
  customerUsername: "budi.santoso",
  voucherCode: null,
  note: null,
  entity: "PointTransaction",
  entityId: "pt1",
  metadata: null,
};

const ADMIN_ENTRY: AuditLogEntry = {
  id: "al1",
  source: "ADMIN",
  createdAt: new Date("2026-10-15T05:00:00.000Z"),
  actionKey: "REWARD_CREATED",
  amount: null,
  method: null,
  outletId: null,
  outletName: null,
  actorId: "admin-1",
  actorName: "Super Admin",
  customerName: null,
  customerUsername: null,
  voucherCode: null,
  note: null,
  entity: "RewardCatalog",
  entityId: "reward-1",
  metadata: { title: "Gratis 1 Donat Glaze", pointsCost: 5 },
};

describe("escapeCsvCell", () => {
  it("selalu mengutip sel dan menggandakan tanda kutip", () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell("polos")).toBe('"polos"');
  });
});

describe("toAuditCsvRow", () => {
  it("menormalkan baris transaksi poin", () => {
    const row = toAuditCsvRow(POINT_ENTRY);

    expect(row).toContain("Transaksi Poin");
    expect(row).toContain("Injeksi poin");
    expect(row).toContain("Donjun Donat Gowa");
    expect(row).toContain("Budi Santoso");
    expect(row).toContain("@budi.santoso");
    expect(row).toContain("Input username");
    expect(row).toContain("1");
  });

  it("menyertakan metadata aksi administratif sebagai JSON", () => {
    const row = toAuditCsvRow(ADMIN_ENTRY);

    expect(row).toContain("Aksi Administratif");
    expect(row).toContain("Reward dibuat");
    expect(row).toContain("RewardCatalog");
    expect(row.some((cell) => cell.includes("Gratis 1 Donat Glaze"))).toBe(true);
  });
});

describe("buildAuditCsv", () => {
  it("menyusun header dan baris dengan pemisah CRLF", () => {
    const csv = buildAuditCsv([POINT_ENTRY, ADMIN_ENTRY]);
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(AUDIT_CSV_HEADERS.map(escapeCsvCell).join(","));
    // Nama pelaku memuat tanda kutip sehingga harus ter-escape di dalam sel.
    expect(lines[1]).toContain('"Kasir ""Satu"""');
  });

  it("hanya menghasilkan header bila tidak ada entri", () => {
    expect(buildAuditCsv([])).toBe(
      AUDIT_CSV_HEADERS.map(escapeCsvCell).join(","),
    );
  });
});

describe("buildAuditCsvFilename", () => {
  it("memakai tanggal WITA", () => {
    expect(buildAuditCsvFilename(new Date("2026-10-15T04:00:00.000Z"))).toBe(
      "audit-log-2026-10-15.csv",
    );
  });
});
