import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Pesan tingkat form dengan ikon + teks, tidak mengandalkan warna saja
// (design.md §11). Galat memakai role alert, pesan lain role status.
export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon =
    tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-button border px-4 py-3 text-sm",
        tone === "error" &&
          "border-donut-berry/40 bg-donut-berry/10 text-donut-berry-deep",
        tone === "success" &&
          "border-donut-matcha/40 bg-donut-matcha/10 text-donut-matcha-deep",
        tone === "info" && "border-warm-border bg-sky-pastel/60 text-brand-brown-dark",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
