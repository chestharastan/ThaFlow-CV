import { RuleEngine } from "./core/rule-engine";
import { contentRules } from "./quality/content.rules";
import { basicRules } from "./validation/basic.rules";
import { sectionRules } from "./validation/sections.rules";

export * from "./core/types";
export { RuleEngine } from "./core/rule-engine";
export { computeCompleteness } from "./quality/completeness";
export { collectTextFields } from "./quality/content.rules";
export * from "./quality/integrity";
export * from "./normalize";
export * from "./classification/classify";

export const defaultRules = [...basicRules, ...sectionRules, ...contentRules];

/** Engine preloaded with the built-in rule registry. */
export function createRuleEngine(): RuleEngine {
  return new RuleEngine(defaultRules);
}
