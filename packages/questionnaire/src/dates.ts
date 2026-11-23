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
