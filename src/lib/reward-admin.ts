import { z } from "zod";

import { RewardBenefitType } from "@/generated/prisma/enums";
import { parseWitaDateEndInclusive, parseWitaDateStart } from "@/lib/datetime";

// Skema validasi manajemen katalog reward (PRD §5.3 fitur 2). Dipakai di klien
// untuk umpan balik langsung dan wajib divalidasi ulang di Server Action
// (AGENTS.md aturan 1). Periode promo diisi sebagai tanggal kalender WITA
// (`yyyy-MM-dd`) dan diterjemahkan menjadi instant UTC di server. Tipe manfaat
// voucher (PRD §5.4 fitur 4, §7.3) menentukan kolom tambahan yang disimpan:
// PRODUCT menautkan menu, PERCENT_DISCOUNT/AMOUNT_DISCOUNT menyimpan potongan.

export const REWARD_TITLE_MIN = 3;
export const REWARD_TITLE_MAX = 120;
export const REWARD_DESCRIPTION_MAX = 500;
export const REWARD_TERMS_MAX = 2000;
export const REWARD_MAX_POINTS_COST = 100_000;
export const REWARD_MAX_QUOTA = 1_000_000;
export const REWARD_MAX_PER_USER_LIMIT = 1_000;
export const REWARD_ID_MAX = 64;
export const REWARD_DISCOUNT_PERCENT_MIN = 1;
export const REWARD_DISCOUNT_PERCENT_MAX = 100;
export const REWARD_MAX_DISCOUNT_AMOUNT = 100_000_000;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Teks opsional: string kosong/absens dianggap tidak diisi (null).
function optionalTextSchema(max: number, error: string) {
  return z
    .string({ error })
    .trim()
    .max(max, { error })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

// Bilangan cacah opsional: kosong berarti tidak terbatas (null).
function optionalCountSchema(max: number, error: string) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : value,
    z.union([
      z.null(),
      z.coerce
        .number({ error })
        .int({ error })
        .min(1, { error })
        .max(max, { error }),
    ]),
  );
}

// Bilangan opsional dalam rentang tertentu: kosong berarti null. Dipakai untuk
// persentase dan nominal potongan yang hanya relevan pada tipe manfaat tertentu.
function optionalNumberSchema(min: number, max: number, error: string) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : value,
    z.union([
      z.null(),
      z.coerce
        .number({ error })
        .int({ error })
        .min(min, { error })
        .max(max, { error }),
    ]),
  );
}

// Tanggal kalender opsional (yyyy-MM-dd WITA); kosong berarti tidak dibatasi.
function optionalDateSchema(label: string) {
  const error = `${label} tidak valid.`;

  return z
    .string({ error })
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || DATE_ONLY_PATTERN.test(value), {
      error,
    });
}

export const rewardFormSchema = z
  .object({
    title: z
      .string({ error: "Nama promo wajib diisi." })
      .trim()
      .min(REWARD_TITLE_MIN, {
        error: `Nama promo minimal ${REWARD_TITLE_MIN} karakter.`,
      })
      .max(REWARD_TITLE_MAX, {
        error: `Nama promo maksimal ${REWARD_TITLE_MAX} karakter.`,
      }),
    description: optionalTextSchema(
      REWARD_DESCRIPTION_MAX,
      `Deskripsi maksimal ${REWARD_DESCRIPTION_MAX} karakter.`,
    ),
    pointsCost: z.coerce
      .number({ error: "Biaya poin wajib diisi." })
      .int({ error: "Biaya poin harus bilangan bulat." })
      .min(1, { error: "Biaya poin minimal 1." })
      .max(REWARD_MAX_POINTS_COST, {
        error: `Biaya poin maksimal ${REWARD_MAX_POINTS_COST}.`,
      }),
    quota: optionalCountSchema(
      REWARD_MAX_QUOTA,
      `Kuota harus bilangan bulat 1 sampai ${REWARD_MAX_QUOTA}.`,
    ),
    perUserLimit: optionalCountSchema(
      REWARD_MAX_PER_USER_LIMIT,
      `Batas klaim per pelanggan harus bilangan bulat 1 sampai ${REWARD_MAX_PER_USER_LIMIT}.`,
    ),
    startAt: optionalDateSchema("Tanggal mulai"),
    endAt: optionalDateSchema("Tanggal berakhir"),
    terms: optionalTextSchema(
      REWARD_TERMS_MAX,
      `Syarat & Ketentuan maksimal ${REWARD_TERMS_MAX} karakter.`,
    ),
    isActive: z.boolean({ error: "Status aktif tidak valid." }),
    benefitType: z.enum(RewardBenefitType, {
      error: "Tipe manfaat voucher tidak valid.",
    }),
    linkedMenuId: z
      .string({ error: "Menu tertaut tidak valid." })
      .trim()
      .max(REWARD_ID_MAX, { error: "Menu tertaut tidak valid." })
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    discountPercent: optionalNumberSchema(
      REWARD_DISCOUNT_PERCENT_MIN,
      REWARD_DISCOUNT_PERCENT_MAX,
      `Persentase diskon harus bilangan bulat ${REWARD_DISCOUNT_PERCENT_MIN} sampai ${REWARD_DISCOUNT_PERCENT_MAX}.`,
    ),
    discountAmount: optionalNumberSchema(
      1,
      REWARD_MAX_DISCOUNT_AMOUNT,
      `Nominal diskon harus bilangan bulat 1 sampai ${REWARD_MAX_DISCOUNT_AMOUNT}.`,
    ),
  })
  // `yyyy-MM-dd` dapat dibandingkan secara leksikografis, sehingga urutan
  // periode cukup divalidasi sebagai string.
  .refine(
    (data) => !data.startAt || !data.endAt || data.startAt <= data.endAt,
    {
      path: ["endAt"],
      error: "Tanggal berakhir tidak boleh sebelum tanggal mulai.",
    },
  )
  // Kolom tambahan wajib terisi sesuai tipe manfaat yang dipilih (PRD §5.4
  // fitur 4): PRODUCT menautkan menu, PERCENT_DISCOUNT butuh persentase,
  // AMOUNT_DISCOUNT butuh nominal.
  .refine(
    (data) =>
      data.benefitType !== RewardBenefitType.PRODUCT ||
      Boolean(data.linkedMenuId),
    {
      path: ["linkedMenuId"],
      error: "Pilih menu yang digratiskan untuk tipe manfaat ini.",
    },
  )
  .refine(
    (data) =>
      data.benefitType !== RewardBenefitType.PERCENT_DISCOUNT ||
      data.discountPercent !== null,
    {
      path: ["discountPercent"],
      error: "Isi persentase diskon untuk tipe manfaat ini.",
    },
  )
  .refine(
    (data) =>
      data.benefitType !== RewardBenefitType.AMOUNT_DISCOUNT ||
      data.discountAmount !== null,
    {
      path: ["discountAmount"],
      error: "Isi nominal diskon untuk tipe manfaat ini.",
    },
  );

export type RewardFormInput = z.infer<typeof rewardFormSchema>;

// Menormalkan kolom manfaat sesuai tipe terpilih agar nilai yang tidak relevan
// tidak tersimpan (mis. persentase tertinggal saat tipe diganti ke GENERIC).
export type RewardBenefit = {
  benefitType: RewardBenefitType;
  linkedMenuId: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
};

export function normalizeRewardBenefit(input: RewardBenefit): RewardBenefit {
  switch (input.benefitType) {
    case RewardBenefitType.PRODUCT:
      return {
        benefitType: RewardBenefitType.PRODUCT,
        linkedMenuId: input.linkedMenuId,
        discountPercent: null,
        discountAmount: null,
      };
    case RewardBenefitType.PERCENT_DISCOUNT:
      return {
        benefitType: RewardBenefitType.PERCENT_DISCOUNT,
        linkedMenuId: null,
        discountPercent: input.discountPercent,
        discountAmount: null,
      };
    case RewardBenefitType.AMOUNT_DISCOUNT:
      return {
        benefitType: RewardBenefitType.AMOUNT_DISCOUNT,
        linkedMenuId: null,
        discountPercent: null,
        discountAmount: input.discountAmount,
      };
    default:
      return {
        benefitType: RewardBenefitType.GENERIC,
        linkedMenuId: null,
        discountPercent: null,
        discountAmount: null,
      };
  }
}

export const rewardIdSchema = z
  .string({ error: "Reward tidak valid." })
  .trim()
  .min(1, { error: "Reward tidak valid." })
  .max(REWARD_ID_MAX, { error: "Reward tidak valid." });

// Menerjemahkan periode tanggal kalender WITA menjadi instant UTC: awal hari
// untuk `startAt`, akhir hari inklusif untuk `endAt` (PRD §5.3 fitur 2).
export function toRewardPeriod(period: {
  startAt: string | null;
  endAt: string | null;
}): { startAt: Date | null; endAt: Date | null } {
  return {
    startAt: period.startAt ? parseWitaDateStart(period.startAt) : null,
    endAt: period.endAt ? parseWitaDateEndInclusive(period.endAt) : null,
  };
}
