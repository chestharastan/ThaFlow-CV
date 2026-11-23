import type { CVLanguage } from "@thaflow/cv-core";

/**
 * Common qualifications offered in the degree dropdown, written the way they
 * should appear on the CV (so they follow the CV's language, not the interface's).
 * People can still type anything else.
 */
const DEGREES: Record<CVLanguage, string[]> = {
  en: ["High school diploma", "Associate degree", "Bachelor's degree", "Master's degree", "Doctorate (PhD)", "Diploma", "Certificate"],
  km: ["សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ", "បរិញ្ញាបត្ររង", "បរិញ្ញាបត្រ", "បរិញ្ញាបត្រជាន់ខ្ពស់", "បណ្ឌិត", "សញ្ញាបត្រ", "វិញ្ញាបនបត្រ"],
};

export function degreeOptions(language: CVLanguage): string[] {
  return DEGREES[language];
}
