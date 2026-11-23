import type { CVDocument, CVLanguage } from "@thaflow/cv-core";
import { computeCompleteness } from "../quality/completeness";
import type { Rule, RuleContext, RuleReport, RuleResult } from "./types";

export class RuleEngine {
  private readonly rules = new Map<string, Rule>();

  constructor(rules: Rule[] = []) {
    for (const rule of rules) this.register(rule);
  }

  register(rule: Rule): void {
    if (this.rules.has(rule.id)) throw new Error(`Duplicate rule id: ${rule.id}`);
    this.rules.set(rule.id, rule);
  }

  list(): Rule[] {
    return [...this.rules.values()];
  }

  /** Run every applicable rule. Only failures are reported. */
  run(cv: CVDocument, options: { locale?: CVLanguage; now?: Date } = {}): RuleReport {
    const ctx: RuleContext = {
      cv,
      locale: options.locale ?? cv.metadata.language,
      now: options.now ?? new Date(),
    };
    const results: RuleResult[] = [];
    for (const rule of this.rules.values()) {
      if (rule.languages && !rule.languages.includes(cv.metadata.language)) continue;
      if (rule.appliesTo && !rule.appliesTo(ctx)) continue;
      let findings: ReturnType<Rule["evaluate"]>;
      try {
        findings = rule.evaluate(ctx);
      } catch {
        continue; // A broken rule must never block the user from editing or exporting.
      }
      for (const finding of findings) {
        results.push({ ruleId: rule.id, passed: false, severity: rule.severity, ...finding });
      }
    }
    const order = { error: 0, warning: 1, info: 2 } as const;
    results.sort((a, b) => order[a.severity] - order[b.severity]);
    const counts = { info: 0, warning: 0, error: 0 };
    for (const r of results) counts[r.severity] += 1;
    return { results, counts, completeness: computeCompleteness(cv) };
  }
}
