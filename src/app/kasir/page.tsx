import { redirect } from "next/navigation";

// Beranda area kasir mengarah ke alat pemindaian (ROLE_HOME kasir, PRD
// Lampiran B).
export default function KasirIndexPage() {
  redirect("/kasir/scan");
}
