import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Kartu metrik ringkas dashboard admin (design.md §2 register *product*: komponen
// shadcn default, angka penting memakai aksen). Nilai sudah terformat di pemanggil
// melalui util terpusat.
export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-brand-brown-muted">
          <Icon aria-hidden className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-display text-3xl font-bold tabular-nums text-brand-brown-dark">
          {value}
        </p>
        {description ? (
          <p className="text-xs text-brand-brown-muted">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
