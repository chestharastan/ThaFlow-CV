"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPartialDate, type CVLanguage } from "@thaflow/cv-core";
import { DAY_VALUES, MONTH_VALUES, daysInMonth, joinFullDate, joinPartialDate, splitFullDate, splitPartialDate, type FullDateParts } from "@thaflow/questionnaire";
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

/**
 * A date of birth asked as a day, a month and a year in one box, stored as
 * "YYYY-MM-DD" once all three are chosen (a partial date until then). A day the
 * chosen month does not have is let go rather than shown as an error.
 */
export function BirthDateInput({
  label,
  value,
  onChange,
  testId,
  compact,
  className,
}: {
  label: string;
  value: string | undefined;
  onChange(value: string): void;
  testId: string;
  /** The smaller size used in the editor. */
  compact?: boolean;
  className?: string;
}) {
  const { t, settings } = useApp();
  const [parts, setParts] = useState(() => splitFullDate(value));
  const months = useMemo(() => monthNames(settings.uiLanguage), [settings.uiLanguage]);

  // The stored date can change from outside (undo, a restored version): show it.
  useEffect(() => {
    setParts((current) => (joinFullDate(current).value === (value ?? "") ? current : splitFullDate(value)));
  }, [value]);

  const change = (patch: Partial<FullDateParts>) => {
    const next = { ...parts, ...patch };
    if (next.day && Number(next.day) > daysInMonth(next)) next.day = "";
    setParts(next);
    onChange(joinFullDate(next).value);
  };

  // Working ages first; a year outside the usual range is still offered.
  const years = useMemo(() => {
    const latest = new Date().getFullYear() - 12;
    const list = Array.from({ length: latest - 1939 }, (_, i) => String(latest - i));
    return parts.year && !list.includes(parts.year) ? [parts.year, ...list] : list;
  }, [parts.year]);
  const days = DAY_VALUES.slice(0, daysInMonth(parts));
  const part = cx(
    "select-chevron h-full min-w-0 cursor-pointer bg-transparent text-ink outline-none focus-visible:outline-none",
    compact ? "pl-3 text-sm" : "pl-4 text-base",
  );
  const rule = <span className={cx("w-px shrink-0 bg-line", compact ? "my-2" : "my-2.5")} aria-hidden />;

  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend className="mb-1.5 block text-xs font-medium text-muted">{label}</legend>
      <div
        className={cx(
          "flex items-stretch border border-line-strong bg-paper transition-[border-color,box-shadow] hover:border-faint focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10",
          compact ? "h-10 rounded-lg" : "h-12 rounded-xl",
        )}
      >
        <select
          value={parts.day}
          onChange={(e) => change({ day: e.target.value })}
          aria-label={`${label}: ${t("date.day")}`}
          className={cx(part, "flex-[2]", compact ? "rounded-l-lg" : "rounded-l-xl", !parts.day && PLACEHOLDER)}
          data-testid={`${testId}-day`}
        >
          <option value="">{t("date.day")}</option>
          {days.map((day) => (
            <option key={day} value={day} className="text-ink">
              {Number(day)}
            </option>
          ))}
        </select>
        {rule}
        <select
          value={parts.month}
          onChange={(e) => change({ month: e.target.value })}
          aria-label={`${label}: ${t("date.month")}`}
          className={cx(part, "flex-[3]", !parts.month && PLACEHOLDER)}
          data-testid={`${testId}-month`}
        >
          <option value="">{t("date.month")}</option>
          {MONTH_VALUES.map((month, index) => (
            <option key={month} value={month} className="text-ink">
              {months[index]}
            </option>
          ))}
        </select>
        {rule}
        <select
          value={parts.year}
          onChange={(e) => change({ year: e.target.value })}
          aria-label={`${label}: ${t("date.year")}`}
          className={cx(part, "flex-[2]", compact ? "rounded-r-lg" : "rounded-r-xl", !parts.year && PLACEHOLDER)}
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

/**
 * An answer kept as a code ("female", "single") and shown in the interface
 * language. An answer worded some other way stays on offer exactly as written.
 */
export function CodedSelect<T extends string>({
  id,
  value,
  codes,
  label,
  onChange,
  large,
  testId,
}: {
  id: string;
  value: string | undefined;
  codes: readonly T[];
  label(code: T): string;
  onChange(value: string): void;
  large?: boolean;
  testId?: string;
}) {
  const current = value?.trim() ?? "";
  const code = codes.find((c) => c === current.toLowerCase());
  return (
    <select
      id={id}
      value={code ?? current}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className={cx(
        "select-chevron w-full cursor-pointer border border-line-strong bg-paper text-ink transition-[border-color,box-shadow] hover:border-faint focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10",
        large ? "h-12 rounded-xl px-4 text-base" : "h-10 rounded-lg px-3 text-sm",
        !current && PLACEHOLDER,
      )}
    >
      <option value="">—</option>
      {!code && current && (
        <option value={current} className="text-ink">
          {current}
        </option>
      )}
      {codes.map((c) => (
        <option key={c} value={c} className="text-ink">
          {label(c)}
        </option>
      ))}
    </select>
  );
}
