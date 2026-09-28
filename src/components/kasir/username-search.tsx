"use client";

import { LoaderCircle, Search, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOMER_SEARCH_MIN_LENGTH,
  customerSearchQuerySchema,
  normalizeCustomerSearchQuery,
} from "@/lib/customer-search";
import { searchCustomersByUsernameAction } from "@/server/kasir/actions";
import type { CashierCustomer } from "@/server/kasir/customers";

// Jeda debounce agar pencarian tidak membanjiri server saat kasir mengetik.
const DEBOUNCE_MS = 300;

const HINT = "Pencarian mencocokkan awalan username dan tidak membedakan huruf besar/kecil.";

type SearchResponse = {
  query: string;
  customers: CashierCustomer[];
};

// Input username manual sebagai fallback pemindaian (PRD §5.2 fitur 2, §8.3).
// Hanya nama dan username pelanggan yang ditampilkan (PRD §10).
export function UsernameSearch({
  onSelect,
}: {
  onSelect: (customer: CashierCustomer) => void;
}) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [errorQuery, setErrorQuery] = useState<string | null>(null);
  const requestRef = useRef(0);

  // Pencarian dijalankan setelah jeda debounce; pembaruan status hanya terjadi
  // di dalam callback asinkron agar tidak memicu render berantai.
  useEffect(() => {
    const normalized = normalizeCustomerSearchQuery(query);

    if (normalized.length < CUSTOMER_SEARCH_MIN_LENGTH) return;
    if (!customerSearchQuerySchema.safeParse(normalized).success) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    const timer = setTimeout(() => {
      searchCustomersByUsernameAction(normalized)
        .then((result) => {
          if (requestRef.current !== requestId) return;

          if (result.status === "OK") {
            setResponse({ query: normalized, customers: result.customers });
            setErrorQuery(null);
            return;
          }

          setErrorQuery(normalized);
        })
        .catch(() => {
          if (requestRef.current !== requestId) return;
          setErrorQuery(normalized);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Seluruh keadaan tampilan diturunkan saat render dari kata kunci dan hasil
  // yang sudah tersimpan untuk kata kunci tersebut.
  const normalized = normalizeCustomerSearchQuery(query);
  const isQueryValid =
    normalized.length >= CUSTOMER_SEARCH_MIN_LENGTH &&
    customerSearchQuerySchema.safeParse(normalized).success;
  const settled = response?.query === normalized ? response : null;
  const hasError = errorQuery === normalized;

  let message = HINT;
  if (normalized.length > 0 && normalized.length < CUSTOMER_SEARCH_MIN_LENGTH) {
    message = `Ketik minimal ${CUSTOMER_SEARCH_MIN_LENGTH} karakter.`;
  } else if (normalized.length >= CUSTOMER_SEARCH_MIN_LENGTH && !isQueryValid) {
    message = "Hanya huruf, angka, titik, atau garis bawah.";
  }

  const showLoading = isQueryValid && !settled && !hasError;
  const showEmpty = isQueryValid && settled !== null && settled.customers.length === 0;
  const showResults = isQueryValid && settled !== null && settled.customers.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="kasir-username">Username pelanggan</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-brand-brown-muted"
          />
          <Input
            id="kasir-username"
            name="kasir-username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby="kasir-username-pesan"
            placeholder="Ketik username, contoh: budi"
            className="h-12 bg-card pl-10 text-base"
          />
        </div>
        <p
          id="kasir-username-pesan"
          aria-live="polite"
          className="text-xs text-brand-brown-muted"
        >
          {message}
        </p>
      </div>

      {showLoading ? (
        <p className="flex items-center gap-2 px-1 text-sm text-brand-brown-muted">
          <LoaderCircle
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Mencari pelanggan...
        </p>
      ) : null}

      {showEmpty ? (
        <p className="px-1 text-sm text-brand-brown-muted">
          Pelanggan dengan awalan tersebut tidak ditemukan.
        </p>
      ) : null}

      {hasError ? (
        <p role="alert" className="px-1 text-sm text-donut-berry-deep">
          Terjadi kendala saat mencari. Periksa koneksi lalu coba lagi.
        </p>
      ) : null}

      {showResults ? (
        <ul className="flex flex-col gap-2">
          {settled.customers.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="flex min-h-14 w-full items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warm-neutral text-brand-brown-muted"
                >
                  <UserRound className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-brand-brown-dark">
                    {customer.name}
                  </span>
                  <span className="block truncate text-sm text-brand-brown-muted">
                    @{customer.username}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
