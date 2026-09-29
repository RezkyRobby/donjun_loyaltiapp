import { NextResponse } from "next/server";

import { buildAuditCsv, buildAuditCsvFilename } from "@/lib/audit-csv";
import { parseAuditLogFilters } from "@/lib/audit-log";
import { getAuditLogEntriesForExport } from "@/server/admin/audit-log";
import { getSuperAdminId } from "@/server/admin/guard";

// Ekspor CSV audit log (PRD §5.3 fitur 3, Lampiran B: /api/admin/* hanya
// SUPER_ADMIN). Middleware sudah menjaga rute; guard di sini adalah lapisan
// kedua (AGENTS.md aturan 6). Filter mengikuti query string halaman audit.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actorId = await getSuperAdminId();

  if (!actorId) {
    return NextResponse.json(
      { message: "Anda tidak memiliki akses ke berkas ini." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const filters = parseAuditLogFilters(params);
  const entries = await getAuditLogEntriesForExport(filters);
  const csv = buildAuditCsv(entries);

  // BOM UTF-8 membantu Excel membaca huruf beraksen dengan benar.
  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildAuditCsvFilename(new Date())}"`,
      "Cache-Control": "no-store",
    },
  });
}
