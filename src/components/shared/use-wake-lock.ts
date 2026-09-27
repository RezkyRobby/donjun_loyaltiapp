"use client";

import { useEffect } from "react";

// Tipe minimal Wake Lock API agar tidak bergantung pada versi lib.dom. Sebagian
// peramban mobile belum mendukungnya, sehingga permintaan selalu dibungkus
// pengecekan runtime.
type WakeLockSentinelLike = { release: () => Promise<unknown> };
type WakeLockLike = {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
};

// Menjaga layar tetap menyala saat QR Code atau barcode ditampilkan penuh
// (design.md §9.1 & §9.2). Wake lock dilepas otomatis saat tab disembunyikan
// dan diambil ulang saat tab kembali terlihat; kegagalan diabaikan dengan
// tenang karena hanya pengoptimalan kenyamanan.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike })
      .wakeLock;
    let sentinel: WakeLockSentinelLike | null = null;

    async function acquire() {
      if (!wakeLock) return;

      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        // Diabaikan dengan sengaja.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}
