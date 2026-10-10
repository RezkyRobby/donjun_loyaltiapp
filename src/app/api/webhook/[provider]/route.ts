import { NextResponse, type NextRequest } from "next/server";

import { getPaymentAdapter } from "@/server/payments/registry";

// Route webhook pembayaran (PRD §8.9, Lampiran B). Tidak memakai sesi —
// keamanan bersumber dari verifikasi tanda tangan provider dan idempotensi
// (keduanya belum diaktifkan pada v1). Middleware tidak menjaga rute
// `/api/webhook/*` karena tidak ada aturan peran yang cocok untuk path ini.
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  // Provider tanpa adapter berarti gateway belum/tidak diaktifkan (v1 hanya
  // transfer manual, sehingga registri adapter kosong).
  if (!getPaymentAdapter(provider)) {
    return NextResponse.json(
      { message: "Provider pembayaran tidak dikenal." },
      { status: 404 },
    );
  }

  // Adapter terdaftar: verifikasi tanda tangan dan pemetaan status pembayaran
  // ke status pesanan dikerjakan pada fase gateway (belum aktif pada v1).
  return NextResponse.json(
    { message: "Webhook pembayaran belum aktif." },
    { status: 501 },
  );
}
