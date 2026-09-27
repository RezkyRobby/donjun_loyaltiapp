"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Tombol masuk/daftar dengan Google (PRD §5.1 fitur 1). callbackURL menentukan
// tujuan setelah otorisasi: pelanggan diarahkan melengkapi username bila belum
// memilikinya.
export function GoogleAuthButton({
  callbackURL,
  label = "Lanjutkan dengan Google",
}: {
  callbackURL: string;
  label?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });

    // Saat berhasil, peramban dialihkan ke Google sehingga baris berikutnya
    // hanya berjalan bila terjadi kegagalan.
    if (signInError) {
      setError("Gagal memulai masuk dengan Google. Coba lagi.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className="h-12 w-full"
      >
        {isLoading ? "Menghubungkan ke Google..." : label}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-donut-berry-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
