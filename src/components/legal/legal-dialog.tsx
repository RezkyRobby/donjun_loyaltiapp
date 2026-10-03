"use client";

import { X } from "lucide-react";
import {
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

// Pemicu + pop-up dokumen hukum (design.md §9.5). Memakai elemen <dialog>
// native agar fokus terkunci dan tombol Esc menutup secara bawaan. Dialog
// dipindahkan ke document.body lewat portal supaya tidak pernah bersarang di
// dalam <label> persetujuan — klik di dalam label akan ikut menjungkirkan
// centang bila elemennya menjadi turunan label. Deteksi klien memakai
// useSyncExternalStore agar snapshot server tetap null dan hidrasi cocok.
export function LegalDialog({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="font-medium text-brand-orange-deep underline underline-offset-2"
      >
        {label}
      </button>
      {isClient
        ? createPortal(
            <dialog
              ref={dialogRef}
              aria-labelledby={titleId}
              className="m-auto w-[min(42rem,calc(100%-2rem))] rounded-card border border-border bg-card p-0 text-brand-brown-dark backdrop:bg-brand-brown-dark/60"
            >
              <div className="flex max-h-[85dvh] flex-col">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-warm-border p-4">
                  <h2
                    id={titleId}
                    className="font-display text-xl font-bold text-brand-brown-dark"
                  >
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={`Tutup ${title}`}
                    className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-button text-brand-brown-muted hover:bg-muted hover:text-brand-brown-dark"
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {children}
                </div>
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}
