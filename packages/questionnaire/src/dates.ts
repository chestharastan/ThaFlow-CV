/**
 * Dates are asked as an optional month plus a year, and stored as the CV's
 * partial dates: "YYYY" or "YYYY-MM" (see @thaflow/cv-core dates).
 */

export const MONTH_VALUES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;

export interface DateParts {
  /** "01" to "12", or "" when only the year is known. */
  month: string;
  /** The year as typed. */
  year: string;
}

const PARTIAL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;
const KHMER_ZERO = 0x17e0;

/** Khmer numerals (០-៩) as ASCII digits, so a year typed on a Khmer keyboard is understood. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[០-៩]/g, (digit) => String(digit.charCodeAt(0) - KHMER_ZERO));
}

export function splitPartialDate(value: string | undefined): DateParts {
  const match = PARTIAL_DATE.exec(value ?? "");
  return match ? { month: match[2] ?? "", year: match[1]! } : { month: "", year: "" };
}

export interface JoinedDate {
  /** The partial date to store; "" when there is nothing (yet) to store. */
  value: string;
  /** False when what was typed cannot be stored: a year that is not four digits, or a month without a year. */
  valid: boolean;
}

export function joinPartialDate(parts: DateParts): JoinedDate {
  const year = toAsciiDigits(parts.year).trim();
  const month = (MONTH_VALUES as readonly string[]).includes(parts.month) ? parts.month : "";
  if (!year) return { value: "", valid: !month };
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) return { value: "", valid: false };
  return { value: month ? `${year}-${month}` : year, valid: true };
}

/* ---------- A whole date: the date of birth ---------- */

export const DAY_VALUES = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

export interface FullDateParts extends DateParts {
  /** "01" to "31", or "" when the day is not given. */
  day: string;
}

const FULL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/;

/** The parts of a stored date of birth: "YYYY-MM-DD", or a partial date. Anything else reads as empty. */
export function splitFullDate(value: string | undefined): FullDateParts {
  const match = FULL_DATE.exec(value ?? "");
  return match ? { day: match[3] ?? "", month: match[2] ?? "", year: match[1]! } : { day: "", month: "", year: "" };
}

/** How many days the month has (31 while the month is unknown; February counts a leap day unless the year rules it out). */
export function daysInMonth(parts: DateParts): number {
  if (!(MONTH_VALUES as readonly string[]).includes(parts.month)) return 31;
  const year = /^\d{4}$/.test(parts.year) ? Number(parts.year) : 2000;
  return new Date(Date.UTC(year, Number(parts.month), 0)).getUTCDate();
}

/**
 * The date to store: "YYYY-MM-DD" once the day, the month and the year are all
 * chosen, a partial date before that. A day without its month and year, or a
 * day the month does not have, cannot be stored.
 */
export function joinFullDate(parts: FullDateParts): JoinedDate {
  const base = joinPartialDate(parts);
  if (!DAY_VALUES.includes(parts.day)) return base;
  if (!base.valid || base.value.length !== 7 || Number(parts.day) > daysInMonth(parts)) return { value: base.value, valid: false };
  return { value: `${base.value}-${parts.day}`, valid: true };
}
