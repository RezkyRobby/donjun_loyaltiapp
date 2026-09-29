import { id as localeId } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// Seluruh logika tanggal operasional memakai WITA (PRD §9): data disimpan dalam
// UTC, sedangkan penampilan dan agregasi memakai zona Asia/Makassar (UTC+8).
export const WITA_TIME_ZONE = "Asia/Makassar";

const DATE_TIME_FORMAT = "d MMMM yyyy HH:mm";
const TIME_FORMAT = "HH:mm";
const DATE_FORMAT = "d MMMM yyyy";
const DAY_KEY_FORMAT = "yyyy-MM-dd";

export function formatDateTimeWita(date: Date): string {
  return formatInTimeZone(date, WITA_TIME_ZONE, DATE_TIME_FORMAT, {
    locale: localeId,
  });
}

// Jam WITA untuk konteks harian (mis. riwayat injeksi hari berjalan).
export function formatTimeWita(date: Date): string {
  return formatInTimeZone(date, WITA_TIME_ZONE, TIME_FORMAT, {
    locale: localeId,
  });
}

export function formatDateWita(date: Date): string {
  return formatInTimeZone(date, WITA_TIME_ZONE, DATE_FORMAT, {
    locale: localeId,
  });
}

// Kunci hari (yyyy-MM-dd WITA) untuk pengelompokan harian dan pelaporan.
export function witaDayKey(date: Date): string {
  return formatInTimeZone(date, WITA_TIME_ZONE, DAY_KEY_FORMAT);
}

// Awal hari WITA sebagai instant UTC, dipakai untuk batas harian laporan.
export function startOfDayWita(date: Date = new Date()): Date {
  const [year, month, day] = witaDayKey(date).split("-").map(Number);

  return fromZonedTime(new Date(year, month - 1, day), WITA_TIME_ZONE);
}

// Batas akhir hari WITA (eksklusif) sebagai instant UTC, yaitu awal hari
// berikutnya. WITA tidak menerapkan DST sehingga penambahan 24 jam tepat.
export function endOfDayWita(date: Date = new Date()): Date {
  return new Date(startOfDayWita(date).getTime() + 24 * 60 * 60 * 1000);
}

// Awal bulan WITA sebagai instant UTC, dipakai untuk batas bulanan laporan.
export function startOfMonthWita(date: Date = new Date()): Date {
  const [year, month] = witaDayKey(date).split("-").map(Number);

  return fromZonedTime(new Date(year, month - 1, 1), WITA_TIME_ZONE);
}

// Batas akhir bulan WITA (eksklusif) sebagai instant UTC, yaitu awal bulan
// berikutnya. Dipakai sebagai batas periode "bulan berjalan" pada laporan
// analitik (PRD §5.3 fitur 1).
export function endOfMonthWita(date: Date = new Date()): Date {
  const [year, month] = witaDayKey(date).split("-").map(Number);

  return fromZonedTime(new Date(year, month, 1), WITA_TIME_ZONE);
}

// Mengubah tanggal kalender WITA (format `yyyy-MM-dd`) menjadi instant UTC awal
// hari. Dipakai menerjemahkan periode promo dari input tanggal admin.
export function parseWitaDateStart(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);

  return fromZonedTime(new Date(year, month - 1, day), WITA_TIME_ZONE);
}

// Akhir hari WITA inklusif (23:59:59.999) dari tanggal kalender WITA. `endAt`
// promo bersifat inklusif di kedua ujung (PRD §5.3 fitur 2).
export function parseWitaDateEndInclusive(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(
    fromZonedTime(new Date(year, month - 1, day + 1), WITA_TIME_ZONE).getTime() -
      1,
  );
}
