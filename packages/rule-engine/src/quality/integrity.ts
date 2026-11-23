/**
 * Integrity checks for AI output. The LLM handles language; these checks make
 * sure it did not invent facts. Anything flagged here is shown to the user as
 * a warning on the suggestion before they can accept it.
 */

const NUMBER = /\d+(?:[.,]\d+)?%?/g;
const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";

function normalizeDigits(text: string): string {
  return text.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
}

function numbersIn(text: string): Set<string> {
  return new Set((normalizeDigits(text).match(NUMBER) ?? []).map((n) => n.replace(",", ".")));
}

const CLAIM_WORDS = [
  "award",
  "awarded",
  "certified",
  "promoted",
  "led a team",
  "managed a team",
  "increased",
  "reduced",
  "revenue",
  "million",
  "first place",
  "top performer",
];

export interface IntegrityFinding {
  kind: "new-number" | "new-claim" | "length";
  detail: string;
}

/** Compare a suggestion against the user's original text and flag unsupported additions. */
export function checkSuggestionIntegrity(original: string, suggested: string): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const known = numbersIn(original);
  for (const n of numbersIn(suggested)) {
    if (!known.has(n)) findings.push({ kind: "new-number", detail: n });
  }
  const lowerOriginal = original.toLowerCase();
  const lowerSuggested = suggested.toLowerCase();
  for (const word of CLAIM_WORDS) {
    if (lowerSuggested.includes(word) && !lowerOriginal.includes(word)) {
      findings.push({ kind: "new-claim", detail: word });
    }
  }
  if (original.trim().length >= 20 && suggested.trim().length > original.trim().length * 3) {
    findings.push({ kind: "length", detail: `${original.trim().length} → ${suggested.trim().length}` });
  }
  return findings;
}

export function describeIntegrityFinding(finding: IntegrityFinding, locale: "en" | "km"): string {
  const text = {
    "new-number": {
      en: `Contains "${finding.detail}", which is not in your original text.`,
      km: `មានលេខ "${finding.detail}" ដែលមិនមាននៅក្នុងអត្ថបទដើមរបស់អ្នក។`,
    },
    "new-claim": {
      en: `Adds a claim ("${finding.detail}") that is not in your original text.`,
      km: `បន្ថែមការអះអាង ("${finding.detail}") ដែលមិនមាននៅក្នុងអត្ថបទដើមរបស់អ្នក។`,
    },
    length: {
      en: "Much longer than your original text. Check that every detail is true.",
      km: "វែងជាងអត្ថបទដើមរបស់អ្នកច្រើន។ សូមពិនិត្យថាព័ត៌មានទាំងអស់ពិតប្រាកដ។",
    },
  } as const;
  return text[finding.kind][locale];
}
