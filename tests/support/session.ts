import { vi } from "vitest";

import { getSession } from "@/server/auth/session";

// Setiap berkas uji integrasi memock "@/server/auth/session" agar Server Action
// dapat dijalankan tanpa alur HTTP Next.js. Helper ini menyetel identitas yang
// dikembalikan `getSession` versi mock tersebut.
type SessionUser = { id: string; role: string };

type SessionValue = Awaited<ReturnType<typeof getSession>>;

function toSessionValue(user: SessionUser | null): SessionValue {
  return (user ? { user } : null) as unknown as SessionValue;
}

export function setSession(user: SessionUser | null): void {
  vi.mocked(getSession).mockResolvedValue(toSessionValue(user));
}

// Mengantre identitas berbeda untuk pemanggilan bersamaan (mis. dua pelanggan
// menukar promo yang sama pada saat yang sama).
export function queueSessions(users: SessionUser[]): void {
  const mocked = vi.mocked(getSession);

  for (const user of users) {
    mocked.mockResolvedValueOnce(toSessionValue(user));
  }
}
