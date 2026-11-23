"use client";

import { useMemo, useState } from "react";
import { formatPartialDate, type CVLanguage } from "@thaflow/cv-core";
import { MONTH_VALUES, joinPartialDate, splitPartialDate } from "@thaflow/questionnaire";
import { cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";

/** A native select is a little shorter than a text box of the same size; this lines them up. */
export const BOX_HEIGHT = "";
/** A select showing its empty option reads as a placeholder, like an empty text box. */
export const PLACEHOLDER = "text-faint!";

function monthNames(language: CVLanguage): string[] {
  // Khmer month names come from the CV core, the same words the CV prints: not every browser has Khmer
  // locale data, and one that lacks it would quietly answer in English.
  if (language === "km") return MONTH_VALUES.map((month) => formatPartialDate(`2000-${month}`, "km").replace(/\s*2000$/, ""));
  const format = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
  return MONTH_VALUES.map((_, index) => format.format(new Date(Date.UTC(2000, index, 1))));
}

/**
 * A date asked as an optional month and a year, stored as "YYYY" or "YYYY-MM".
 * What is typed stays on screen as typed; `onChange` receives the storable
 * value ("" until the year is complete) and whether the input can be stored.
 */
export function DateInput({
  label,
  value,
  onChange,
  showInvalid,
  invalid,
  testId,
  className,
}: {
  label: string;
  value: string | undefined;
  onChange(value: string, valid: boolean): void;
  /** Mark the year box when what is typed cannot be stored. */
  showInvalid?: boolean;
  /** Mark the year box for a reason only the caller knows (for example an end before the start). */
  invalid?: boolean;
  testId: string;
  className?: string;
}) {
  const { t, settings } = useApp();
  const [parts, setParts] = useState(() => splitPartialDate(value));
  const months = useMemo(() => monthNames(settings.uiLanguage), [settings.uiLanguage]);
  const valid = joinPartialDate(parts).valid;

  const change = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    const joined = joinPartialDate(next);
    onChange(joined.value, joined.valid);
  };

  // Recent years first; a year outside the usual range (from an imported CV) is still offered.
  const years = useMemo(() => {
    const latest = new Date().getFullYear() + 6;
    const list = Array.from({ length: latest - 1959 }, (_, i) => String(latest - i));
    return parts.year && !list.includes(parts.year) ? [parts.year, ...list] : list;
  }, [parts.year]);
  const bad = invalid || (showInvalid && !valid);
  const part = "select-chevron h-full min-w-0 cursor-pointer bg-transparent pl-4 text-base text-ink outline-none focus-visible:outline-none";

  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend className="mb-1.5 block text-xs font-medium text-muted">{label}</legend>
      {/* One box, two parts: reads as a single date instead of two unrelated fields. */}
      <div
        className={cx(
          "flex h-12 items-stretch rounded-xl border bg-paper transition-[border-color,box-shadow] focus-within:ring-2",
          bad ? "border-danger focus-within:ring-danger/15" : "border-line-strong hover:border-faint focus-within:border-ink focus-within:ring-ink/10",
        )}
      >
        <select
          value={parts.month}
          onChange={(e) => change({ month: e.target.value })}
          aria-label={`${label}: ${t("date.month")}`}
          className={cx(part, "flex-[3] rounded-l-xl", !parts.month && PLACEHOLDER)}
          data-testid={`${testId}-month`}
        >
          <option value="">{t("date.month")}</option>
          {MONTH_VALUES.map((month, index) => (
            <option key={month} value={month} className="text-ink">
              {months[index]}
            </option>
          ))}
        </select>
        <span className="my-2.5 w-px shrink-0 bg-line" aria-hidden />
        <select
          value={parts.year}
          onChange={(e) => change({ year: e.target.value })}
          aria-label={`${label}: ${t("date.year")}`}
          aria-invalid={bad || undefined}
          className={cx(part, "flex-[2] rounded-r-xl", !parts.year && PLACEHOLDER)}
          data-testid={`${testId}-year`}
        >
          <option value="">{t("date.year")}</option>
          {years.map((year) => (
            <option key={year} value={year} className="text-ink">
              {year}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
