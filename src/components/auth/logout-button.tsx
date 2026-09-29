"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Tombol keluar dari akun pelanggan (PRD §5.1). Sesi dihapus lewat Better-Auth
// lalu pengguna diarahkan kembali ke halaman masuk.
export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsPending(true);
    setError(null);

    const { error: signOutError } = await authClient.signOut();

    if (signOutError) {
      setError("Gagal keluar dari akun. Periksa koneksi lalu coba lagi.");
      setIsPending(false);
      return;
    }

    router.push("/masuk");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <Button
        type="button"
        variant="destructive"
        onClick={handleLogout}
        disabled={isPending}
        className="h-12 w-full"
      >
        <LogOut aria-hidden className="size-5" />
        {isPending ? "Keluar..." : "Keluar dari akun"}
      </Button>
    </div>
  );
}
