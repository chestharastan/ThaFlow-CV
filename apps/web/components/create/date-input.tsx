"use client";

import { useMemo, useState } from "react";
import { formatPartialDate, type CVLanguage } from "@thaflow/cv-core";
import { MONTH_VALUES, joinPartialDate, splitPartialDate, toAsciiDigits } from "@thaflow/questionnaire";
import { Select, TextInput, cx } from "@/components/ui";
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

  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend className="mb-1.5 block text-xs font-medium text-muted">{label}</legend>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Select
            controlSize="lg"
            value={parts.month}
            onChange={(e) => change({ month: e.target.value })}
            aria-label={`${label}: ${t("create.month")}`}
            className={cx(BOX_HEIGHT, !parts.month && PLACEHOLDER)}
            data-testid={`${testId}-month`}
          >
            <option value="">{t("create.month")}</option>
            {MONTH_VALUES.map((month, index) => (
              <option key={month} value={month} className="text-ink">
                {months[index]}
              </option>
            ))}
          </Select>
        </div>
        {/* Widths live on wrappers: the boxes themselves are always full width. */}
        <div className="w-24 shrink-0">
          <TextInput
            controlSize="lg"
            value={parts.year}
            onChange={(e) => change({ year: toAsciiDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 4) })}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder={t("create.year")}
            aria-label={`${label}: ${t("create.year")}`}
            invalid={invalid || (showInvalid && !valid)}
            data-testid={`${testId}-year`}
          />
        </div>
      </div>
    </fieldset>
  );
}
