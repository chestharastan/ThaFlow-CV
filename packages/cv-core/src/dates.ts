import type { CVLanguage } from "./schema";

const PARTIAL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

export function isValidPartialDate(value: string | undefined): boolean {
  if (!value) return true;
  return PARTIAL_DATE.test(value);
}

/** Comparable number for a partial date (months since year 0), or null. */
export function dateToMonths(value: string | undefined, endOfYear = false): number | null {
  if (!value) return null;
  const m = PARTIAL_DATE.exec(value);
  if (!m) return null;
  const month = m[2] ? Number(m[2]) : endOfYear ? 12 : 1;
  return Number(m[1]) * 12 + (month - 1);
}

const MONTHS: Record<CVLanguage, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  km: ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"],
};
const PRESENT: Record<CVLanguage, string> = { en: "Present", km: "បច្ចុប្បន្ន" };

export function formatPartialDate(value: string | undefined, language: CVLanguage): string {
  if (!value) return "";
  const m = PARTIAL_DATE.exec(value);
  if (!m) return value;
  if (!m[2]) return m[1]!;
  return `${MONTHS[language][Number(m[2]) - 1]} ${m[1]}`;
}

const FULL_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function isFullDate(value: string | undefined): boolean {
  return Boolean(value && FULL_DATE.test(value));
}

/**
 * A whole date such as a date of birth: "2005-02-19" prints as "19 February 2005"
 * ("19 កុម្ភៈ 2005" in Khmer). A partial date prints as partial dates do, and
 * anything else is printed exactly as it was written.
 */
export function formatFullDate(value: string | undefined, language: CVLanguage): string {
  if (!value) return "";
  const m = FULL_DATE.exec(value);
  if (!m) return formatPartialDate(value, language);
  const month = language === "km" ? MONTHS.km[Number(m[2]) - 1] : LONG_MONTHS[Number(m[2]) - 1];
  return `${Number(m[3])} ${month} ${m[1]}`;
}

export function formatDateRange(
  start: string | undefined,
  end: string | undefined,
  isCurrent: boolean,
  language: CVLanguage,
): string {
  const s = formatPartialDate(start, language);
  const e = isCurrent ? PRESENT[language] : formatPartialDate(end, language);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

/** Deterministic experience duration in months (never delegated to an LLM). */
export function durationInMonths(
  start: string | undefined,
  end: string | undefined,
  isCurrent: boolean,
  now: Date = new Date(),
): number | null {
  const s = dateToMonths(start);
  const e = isCurrent ? now.getFullYear() * 12 + now.getMonth() : dateToMonths(end, true);
  if (s === null || e === null || e < s) return null;
  return e - s + 1;
}
