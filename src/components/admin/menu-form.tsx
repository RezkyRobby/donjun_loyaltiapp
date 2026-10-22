"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MENU_MAX_OPTION_GROUPS,
  MENU_MAX_TAGS_PER_GROUP,
  MENU_NAME_MAX,
  MENU_PRICE_MAX,
  menuFormSchema,
} from "@/lib/menu-admin";
import { toFieldErrors } from "@/lib/registration";
import { createMenu, updateMenu } from "@/server/admin/menus";

// Form buat/ubah menu belanja beserta editor grup opsi/tag (PRD §5.3 fitur 8).
// Validasi klien memakai skema Zod yang sama dengan server (AGENTS.md aturan 1).
// Urutan grup/tag mengikuti posisinya di editor (tidak diisi manual). Gambar
// diunggah ke Cloudinary melalui Server Action.

export type MenuOptionTagDraft = {
  name: string;
  priceDelta: string;
};

export type MenuOptionGroupDraft = {
  name: string;
  tags: MenuOptionTagDraft[];
};

export type MenuFormInitial = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
  imageUrl: string | null;
  optionGroups: MenuOptionGroupDraft[];
};

// Galat bersarang pada editor opsi dipetakan per grup dan per tag agar tampil di
// samping input terkait (design.md §11).
type OptionGroupErrors = {
  group: Record<number, string>;
  tagName: Record<string, string>;
  tagPrice: Record<string, string>;
};

function extractOptionGroupErrors(error: z.ZodError): OptionGroupErrors {
  const result: OptionGroupErrors = { group: {}, tagName: {}, tagPrice: {} };

  for (const issue of error.issues) {
    const [root, groupIndex, section, tagIndex, field] = issue.path;

    if (root !== "optionGroups" || typeof groupIndex !== "number") continue;

    if (section === undefined || section === "name") {
      result.group[groupIndex] ??= issue.message;
      continue;
    }

    if (
      section === "tags" &&
      typeof tagIndex === "number" &&
      typeof field === "string"
    ) {
      const key = `${groupIndex}-${tagIndex}`;
      if (field === "name") result.tagName[key] ??= issue.message;
      if (field === "priceDelta") result.tagPrice[key] ??= issue.message;
    }
  }

  return result;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-galat`} role="alert" className="text-caption text-donut-berry-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-petunjuk`} className="text-caption text-brand-brown-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function MenuForm({
  mode,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  initial?: MenuFormInitial;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? "0");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [optionGroups, setOptionGroups] = useState<MenuOptionGroupDraft[]>(
    initial?.optionGroups ?? [],
  );
  const existingImageUrl = initial?.imageUrl ?? null;
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [optionErrors, setOptionErrors] = useState<OptionGroupErrors>({
    group: {},
    tagName: {},
    tagPrice: {},
  });
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.[0] ?? null);
  }

  function addGroup() {
    setOptionGroups((prev) => [...prev, { name: "", tags: [] }]);
  }

  function removeGroup(groupIndex: number) {
    setOptionGroups((prev) => prev.filter((_, index) => index !== groupIndex));
  }

  function updateGroupName(groupIndex: number, value: string) {
    setOptionGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex ? { ...group, name: value } : group,
      ),
    );
  }

  function addTag(groupIndex: number) {
    setOptionGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? { ...group, tags: [...group.tags, { name: "", priceDelta: "0" }] }
          : group,
      ),
    );
  }

  function removeTag(groupIndex: number, tagIndex: number) {
    setOptionGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? { ...group, tags: group.tags.filter((_, i) => i !== tagIndex) }
          : group,
      ),
    );
  }

  function updateTag(
    groupIndex: number,
    tagIndex: number,
    patch: Partial<MenuOptionTagDraft>,
  ) {
    setOptionGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              tags: group.tags.map((tag, i) =>
                i === tagIndex ? { ...tag, ...patch } : tag,
              ),
            }
          : group,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      categoryId,
      name,
      description,
      price,
      sortOrder,
      isActive,
      optionGroups: optionGroups.map((group, groupIndex) => ({
        name: group.name,
        sortOrder: groupIndex,
        tags: group.tags.map((tag, tagIndex) => ({
          name: tag.name,
          priceDelta: tag.priceDelta,
          sortOrder: tagIndex,
        })),
      })),
      image,
      removeImage,
    };

    const parsed = menuFormSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setOptionErrors(extractOptionGroupErrors(parsed.error));
      setMessage({ tone: "error", text: "Periksa kembali data menu." });
      return;
    }

    setFieldErrors({});
    setOptionErrors({ group: {}, tagName: {}, tagPrice: {} });
    setIsSubmitting(true);

    const result =
      mode === "edit" && initial
        ? await updateMenu(initial.id, payload)
        : await createMenu(payload);

    setIsSubmitting(false);

    if (result.ok) {
      setMessage({ tone: "success", text: result.message });
      router.push("/admin/menu");
      router.refresh();
      return;
    }

    setMessage({
      tone: "error",
      text: result.message ?? "Gagal menyimpan menu.",
    });
    setFieldErrors(result.fieldErrors ?? {});
  }

  const showExistingImage = Boolean(existingImageUrl) && !removeImage && !image;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <FormAlert tone={message.tone}>{message.text}</FormAlert> : null}

      <Field id="name" label="Nama menu" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MENU_NAME_MAX}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-galat" : undefined}
          className="h-12 bg-card"
          placeholder="Contoh: Donat Glaze Coklat"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="categoryId" label="Kategori" error={fieldErrors.categoryId}>
          <select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-invalid={fieldErrors.categoryId ? true : undefined}
            aria-describedby={
              fieldErrors.categoryId ? "categoryId-galat" : undefined
            }
            className="h-12 w-full rounded-lg border border-input bg-card px-2.5 text-base text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          >
            <option value="">Tanpa kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="price" label="Harga" error={fieldErrors.price} hint="Rupiah, tanpa titik.">
          <Input
            id="price"
            name="price"
            type="number"
            min={1}
            max={MENU_PRICE_MAX}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            aria-invalid={fieldErrors.price ? true : undefined}
            aria-describedby={fieldErrors.price ? "price-galat" : "price-petunjuk"}
            className="h-12 bg-card"
            placeholder="8000"
          />
        </Field>
      </div>

      <Field id="description" label="Deskripsi (opsional)" error={fieldErrors.description}>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={
            fieldErrors.description ? "description-galat" : undefined
          }
          className="min-h-24 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
      </Field>

      <Field
        id="sortOrder"
        label="Urutan tampil"
        error={fieldErrors.sortOrder}
        hint="Angka kecil tampil lebih dahulu pada katalog belanja."
      >
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          aria-invalid={fieldErrors.sortOrder ? true : undefined}
          aria-describedby={
            fieldErrors.sortOrder ? "sortOrder-galat" : "sortOrder-petunjuk"
          }
          className="h-12 bg-card"
        />
      </Field>

      <div className="flex flex-col gap-4 rounded-button border border-warm-border bg-warm-neutral/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-brand-brown-dark">
              Grup opsi &amp; tag
            </h2>
            <p className="max-w-md text-caption text-brand-brown-muted">
              Opsional. Contoh grup &quot;Rasa&quot; dengan tag &quot;Coklat&quot;
              yang menambah harga. Tag bersifat multi-pilih saat pelanggan
              memesan.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9"
            onClick={addGroup}
            disabled={optionGroups.length >= MENU_MAX_OPTION_GROUPS}
          >
            <Plus aria-hidden className="size-4" />
            Tambah grup
          </Button>
        </div>

        {optionGroups.length === 0 ? (
          <p className="text-sm text-brand-brown-muted">
            Belum ada grup opsi. Menu ini dapat dipesan tanpa pilihan tambahan.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {optionGroups.map((group, groupIndex) => (
              <li
                key={groupIndex}
                className="flex flex-col gap-3 rounded-button border border-warm-border bg-card p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      id={`group-${groupIndex}-name`}
                      label="Nama grup opsi"
                      error={optionErrors.group[groupIndex]}
                    >
                      <Input
                        id={`group-${groupIndex}-name`}
                        value={group.name}
                        onChange={(event) =>
                          updateGroupName(groupIndex, event.target.value)
                        }
                        aria-invalid={
                          optionErrors.group[groupIndex] ? true : undefined
                        }
                        aria-describedby={
                          optionErrors.group[groupIndex]
                            ? `group-${groupIndex}-name-galat`
                            : undefined
                        }
                        className="h-11 bg-card"
                        placeholder="Contoh: Rasa"
                      />
                    </Field>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11"
                    onClick={() => removeGroup(groupIndex)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Hapus grup
                  </Button>
                </div>

                <div className="flex flex-col gap-3 border-l-2 border-warm-border pl-3">
                  {group.tags.map((tag, tagIndex) => {
                    const tagKey = `${groupIndex}-${tagIndex}`;

                    return (
                      <div
                        key={tagIndex}
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
                      >
                        <div className="flex-1">
                          <Field
                            id={`tag-${groupIndex}-${tagIndex}-name`}
                            label="Nama tag"
                            error={optionErrors.tagName[tagKey]}
                          >
                            <Input
                              id={`tag-${groupIndex}-${tagIndex}-name`}
                              value={tag.name}
                              onChange={(event) =>
                                updateTag(groupIndex, tagIndex, {
                                  name: event.target.value,
                                })
                              }
                              aria-invalid={
                                optionErrors.tagName[tagKey] ? true : undefined
                              }
                              className="h-11 bg-card"
                              placeholder="Contoh: Coklat"
                            />
                          </Field>
                        </div>
                        <div className="sm:w-40">
                          <Field
                            id={`tag-${groupIndex}-${tagIndex}-price`}
                            label="Tambahan harga"
                            error={optionErrors.tagPrice[tagKey]}
                          >
                            <Input
                              id={`tag-${groupIndex}-${tagIndex}-price`}
                              type="number"
                              min={0}
                              value={tag.priceDelta}
                              onChange={(event) =>
                                updateTag(groupIndex, tagIndex, {
                                  priceDelta: event.target.value,
                                })
                              }
                              aria-invalid={
                                optionErrors.tagPrice[tagKey] ? true : undefined
                              }
                              className="h-11 bg-card"
                            />
                          </Field>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-11"
                          onClick={() => removeTag(groupIndex, tagIndex)}
                          aria-label={`Hapus tag ${tag.name || "tanpa nama"}`}
                        >
                          <Trash2 aria-hidden className="size-4" />
                          Hapus
                        </Button>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => addTag(groupIndex)}
                    disabled={group.tags.length >= MENU_MAX_TAGS_PER_GROUP}
                  >
                    <Plus aria-hidden className="size-4" />
                    Tambah tag
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field
        id="image"
        label="Gambar menu (opsional)"
        error={fieldErrors.image}
        hint="JPG, PNG, atau WebP maksimal 5 MB."
      >
        {showExistingImage && existingImageUrl ? (
          <div className="flex items-center gap-3">
            <Image
              src={existingImageUrl}
              alt="Pratinjau gambar menu saat ini"
              width={160}
              height={120}
              className="h-20 w-32 rounded-button border border-warm-border object-cover"
            />
            {mode === "edit" ? (
              <label className="flex items-center gap-2 text-sm text-brand-brown-dark">
                <input
                  type="checkbox"
                  checked={removeImage}
                  onChange={(event) => setRemoveImage(event.target.checked)}
                  className="size-4 accent-brand-orange"
                />
                Hapus gambar
              </label>
            ) : null}
          </div>
        ) : null}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          aria-invalid={fieldErrors.image ? true : undefined}
          aria-describedby={fieldErrors.image ? "image-galat" : "image-petunjuk"}
          className="block w-full cursor-pointer rounded-lg border border-input bg-card text-sm text-brand-brown-muted file:mr-3 file:border-0 file:bg-warm-neutral file:px-4 file:py-3 file:text-sm file:font-medium file:text-brand-brown-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {image ? (
          <p className="text-caption text-brand-brown-muted">
            Berkas dipilih: {image.name}
          </p>
        ) : null}
      </Field>

      <label className="flex items-center gap-2 text-sm text-brand-brown-dark">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-4 accent-brand-orange"
        />
        Menu aktif dan tampil di katalog belanja
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-12">
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Simpan perubahan" : "Simpan menu"}
        </Button>
        <Button asChild variant="ghost" className="h-12">
          <Link href="/admin/menu">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
