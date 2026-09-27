import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

// Klien Better-Auth untuk komponen pelanggan. Plugin disamakan dengan server
// (plugin username tanpa displayUsername + additional fields role/phone) agar
// tipe sesi dan pengguna konsisten.
export const authClient = createAuthClient({
  plugins: [
    usernameClient({ displayUsername: false }),
    inferAdditionalFields<typeof auth>(),
  ],
});
