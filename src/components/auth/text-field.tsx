"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Input teks dengan label, petunjuk, dan galat per-field (design.md §8 & §11):
// label nyata, aria-describedby, dan aria-invalid saat galat.
export type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "password";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

export function TextField({
  id,
  label,
  value,
  onValueChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  hint,
  error,
  required = true,
}: TextFieldProps) {
  const describedBy = error
    ? `${id}-galat`
    : hint
      ? `${id}-petunjuk`
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        className="h-12 bg-card"
      />
      {error ? (
        <p id={`${id}-galat`} role="alert" className="text-xs text-donut-berry-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-petunjuk`} className="text-xs text-brand-brown-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
