export interface JalaaliDate {
  jy: number; // Jalali year (e.g. 1405)
  jm: number; // Jalali month (1-12)
  jd: number; // Jalali day (1-31)
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Western digits (0-9) in a string to Persian digits (۰-۹)
 */
export function toPersianDigits(input: string | number): string {
  const str = input.toString();
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

/**
 * Converts a Gregorian date to Jalali date
 */
export function toJalaali(gy: number, gm: number, gd: number): JalaaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Formats a Date into a Jalali string
 */
export function formatJalaliDate(
  date: Date | number = new Date(),
  options: { persianDigits?: boolean; format?: 'long' | 'numeric' } = {}
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const usePersianDigits = options.persianDigits ?? true;

  if (options.format === 'numeric') {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const raw = `${jy}/${pad(jm)}/${pad(jd)}`;
    return usePersianDigits ? toPersianDigits(raw) : raw;
  }

  const monthName = PERSIAN_MONTHS[jm - 1];
  const dayStr = usePersianDigits ? toPersianDigits(jd) : jd;
  const yearStr = usePersianDigits ? toPersianDigits(jy) : jy;

  return `${dayStr} ${monthName} ${yearStr}`;
}

/**
 * Formats a Date into a Jalali date with time
 */
export function formatJalaliDateTime(
  date: Date | number = new Date(),
  usePersianDigits = true
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const dateStr = formatJalaliDate(d, { persianDigits: usePersianDigits, format: 'long' });
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  return `${dateStr}، ساعت ${usePersianDigits ? toPersianDigits(timeStr) : timeStr}`;
}

/**
 * Generates an automated backup file name with Jalali date and time:
 * e.g. kelidban-backup-1405-08-12-1430.enc
 */
export function getJalaliBackupFilename(date: Date | number = new Date(), prefix = 'kelidban-backup'): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${prefix}-${jy}-${pad(jm)}-${pad(jd)}-${hours}${minutes}.enc`;
}
