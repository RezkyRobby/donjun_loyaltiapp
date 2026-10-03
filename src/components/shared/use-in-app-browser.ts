"use client";

import { useSyncExternalStore } from "react";

import { buildOpenInBrowserUrl, detectInAppBrowser } from "@/lib/device";

// Nilai user-agent tidak pernah berubah selama sesi, sehingga tidak ada
// langganan yang diperlukan. useSyncExternalStore dipakai agar nilai klien
// dibaca tanpa memicu galat hidrasi (snapshot server selalu null).
const subscribe = () => () => {};

export function useInAppBrowser(): {
  label: string | null;
  openUrl: string | null;
} {
  const label = useSyncExternalStore(
    subscribe,
    () => detectInAppBrowser(navigator.userAgent)?.label ?? null,
    () => null,
  );
  const openUrl = useSyncExternalStore(
    subscribe,
    () => buildOpenInBrowserUrl(window.location.href, navigator.userAgent),
    () => null,
  );

  return { label, openUrl };
}
