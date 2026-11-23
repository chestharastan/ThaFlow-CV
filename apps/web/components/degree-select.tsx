"use client";

import { useState } from "react";
import type { CVLanguage } from "@thaflow/cv-core";
import { degreeOptions } from "@thaflow/questionnaire";
import { useApp } from "@/lib/app-context";
import { Select, TextInput, cx } from "./ui";

const OTHER = "__other__";

/**
 * Degree as a dropdown of common qualifications (in the CV's language), with
 * "Other…" opening a box for anything else. A value that is not in the list
 * (typed earlier, or read from an imported CV) shows in that box.
 */
export function DegreeSelect(props: {
  id?: string;
  value: string | undefined;
  onChange(value: string): void;
  language: CVLanguage;
  controlSize?: "sm" | "md" | "lg";
  testId?: string;
  labelledBy?: string;
}) {
  const { t } = useApp();
  const options = degreeOptions(props.language);
  const value = props.value ?? "";
  const [custom, setCustom] = useState(Boolean(value) && !options.includes(value));
  return (
    <div className="space-y-2">
      <Select
        id={props.id}
        aria-labelledby={props.labelledBy}
        controlSize={props.controlSize}
        value={custom ? OTHER : value}
        data-testid={props.testId}
        className={cx(!custom && !value && "text-faint!")}
        onChange={(e) => {
          const next = e.target.value;
          setCustom(next === OTHER);
          props.onChange(next === OTHER ? (options.includes(value) ? "" : value) : next);
        }}
      >
        <option value="">{t("degree.choose")}</option>
        {options.map((option) => (
          <option key={option} value={option} className="text-ink">
            {option}
          </option>
        ))}
        <option value={OTHER} className="text-ink">
          {t("degree.other")}
        </option>
      </Select>
      {custom && (
        <TextInput
          controlSize={props.controlSize}
          value={value}
          autoFocus
          autoComplete="off"
          placeholder={t("degree.otherPlaceholder")}
          aria-label={t("degree.otherPlaceholder")}
          onChange={(e) => props.onChange(e.target.value)}
          data-testid={props.testId ? `${props.testId}-other` : undefined}
        />
      )}
    </div>
  );
}
