import type { CVDocument, CVLanguage, SectionKey } from "@thaflow/cv-core";

export type RuleSeverity = "info" | "warning" | "error";

export type RuleCategory =
  | "required"
  | "validation"
  | "date"
  | "experience"
  | "education"
  | "skills"
  | "content"
  | "consistency"
  | "completeness"
  | "integrity";

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  /** Dot path of the offending field, e.g. "experiences.<id>.endDate". */
  field?: string;
  /** Section the user should open to fix the issue. */
  section?: SectionKey | "personal";
  suggestion?: string;
}

export interface RuleContext {
  cv: CVDocument;
  /** Language used for messages. */
  locale: CVLanguage;
  now: Date;
}

export interface Rule {
  id: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  /** Languages of CV content this rule understands. Omit for language-independent rules. */
  languages?: CVLanguage[];
  /** Execution condition. Omit to always run. */
  appliesTo?(ctx: RuleContext): boolean;
  /** Return one result per finding. An empty array means the rule passed. */
  evaluate(ctx: RuleContext): Omit<RuleResult, "ruleId" | "passed" | "severity">[];
}

export interface RuleReport {
  results: RuleResult[];
  counts: Record<RuleSeverity, number>;
  /** 0–100, computed from measurable criteria only. */
  completeness: number;
}

/** Pick the message for the active locale. */
export function msg(ctx: RuleContext, text: { en: string; km: string }): string {
  return text[ctx.locale];
}
