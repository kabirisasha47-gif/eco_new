const DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Latin digits inside any string to Persian digits. */
export function faDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => DIGITS.charAt(Number(d)));
}

/**
 * Format a number in Persian with thousands separator "٬" and decimal "," (matches the design).
 * Implemented manually so SSR and browser output are byte-identical.
 */
export function fa(value: number, fractionDigits = 0, groupThousands = true): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart = "0", decPart] = fixed.split(".");
  const grouped = groupThousands ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "٬") : intPart;
  const out = decPart && Number(decPart) !== 0 ? `${grouped},${decPart.replace(/0+$/, "")}` : grouped;
  return (negative ? "-" : "") + faDigits(out);
}

/** Like fa() but always keeps the requested number of decimals. */
export function faFixed(value: number, fractionDigits: number): string {
  const [intPart = "0", decPart] = Math.abs(value).toFixed(fractionDigits).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return (value < 0 ? "-" : "") + faDigits(decPart ? `${grouped},${decPart}` : grouped);
}

export function faTimer(totalSeconds: number, withHours = false): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return faDigits(withHours ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`);
}

export const SHAMSI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
