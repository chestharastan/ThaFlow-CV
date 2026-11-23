import type { CVDocument, SectionKey } from "@thaflow/cv-core";
import { msg, type Rule } from "../core/types";

const VAGUE_EN = [
  /\bresponsible for\b/i,
  /\bvarious (tasks|things|duties)\b/i,
  /\bmany things\b/i,
  /\bhelped (out|with)\b/i,
  /\bworked on (stuff|things)\b/i,
  /\betc\.?\b/i,
  /\band so on\b/i,
  /\bhard[- ]?working\b/i,
  /\bteam player\b/i,
];

const INFORMAL_EN = [
  /\b(stuff|kinda|gonna|wanna|lol|btw|pretty good|a lot of things)\b/i,
  /\b(awesome|super cool|really really)\b/i,
  /!{2,}/,
];

interface TextField {
  text: string;
  field: string;
  section: SectionKey;
  label: string;
}

/** Every free-text field a quality rule should look at. */
export function collectTextFields(cv: CVDocument): TextField[] {
  const out: TextField[] = [];
  if (cv.summary.trim()) out.push({ text: cv.summary, field: "summary", section: "summary", label: "Summary" });
  for (const exp of cv.experiences) {
    const label = exp.position || exp.company || "Experience";
    if (exp.description.trim())
      out.push({ text: exp.description, field: `experiences.${exp.id}.description`, section: "experiences", label });
    exp.achievements.forEach((a, i) => {
      if (a.trim())
        out.push({ text: a, field: `experiences.${exp.id}.achievements.${i}`, section: "experiences", label });
    });
  }
  for (const p of cv.projects) {
    if (p.description.trim())
      out.push({
        text: p.description,
        field: `projects.${p.id}.description`,
        section: "projects",
        label: p.name || "Project",
      });
  }
  return out;
}

export const vagueContentRule: Rule = {
  id: "CNT-001",
  description: "Detect descriptions that are too vague.",
  category: "content",
  severity: "warning",
  languages: ["en"],
  evaluate: (ctx) => {
    const out = [];
    for (const f of collectTextFields(ctx.cv)) {
      const hit = VAGUE_EN.map((re) => re.exec(f.text)?.[0]).find(Boolean);
      if (hit) {
        out.push({
          message: msg(ctx, {
            en: `${f.label}: "${hit}" is vague. Say what you did and what the result was.`,
            km: `${f.label}៖ "${hit}" មិនច្បាស់លាស់។ សូមបញ្ជាក់ពីអ្វីដែលអ្នកបានធ្វើ និងលទ្ធផល។`,
          }),
          field: f.field,
          section: f.section,
        });
      }
    }
    return out;
  },
};

export const shortDescriptionRule: Rule = {
  id: "CNT-002",
  description: "Experience descriptions should be more than a few words.",
  category: "content",
  severity: "info",
  evaluate: (ctx) => {
    const out = [];
    for (const exp of ctx.cv.experiences) {
      const text = exp.description.trim();
      const isKhmer = /[ក-៿]/.test(text);
      const tooShort = isKhmer ? text.length < 25 : text.split(/\s+/).length < 6;
      if (text && tooShort && exp.achievements.length === 0) {
        out.push({
          message: msg(ctx, {
            en: `The description for "${exp.position || exp.company}" is very short. Add specifics.`,
            km: `ការពិពណ៌នាសម្រាប់ "${exp.position || exp.company}" ខ្លីពេក។ សូមបន្ថែមព័ត៌មានលម្អិត។`,
          }),
          field: `experiences.${exp.id}.description`,
          section: "experiences" as const,
        });
      }
    }
    return out;
  },
};

export const informalLanguageRule: Rule = {
  id: "CNT-003",
  description: "Identify overly informal wording.",
  category: "content",
  severity: "info",
  languages: ["en"],
  evaluate: (ctx) => {
    const out = [];
    for (const f of collectTextFields(ctx.cv)) {
      const hit = INFORMAL_EN.map((re) => re.exec(f.text)?.[0]).find(Boolean);
      if (hit) {
        out.push({
          message: msg(ctx, {
            en: `${f.label}: "${hit}" reads as informal for a CV.`,
            km: `${f.label}៖ "${hit}" មិនសូវផ្លូវការសម្រាប់ប្រវត្តិរូបសង្ខេប។`,
          }),
          field: f.field,
          section: f.section,
        });
      }
    }
    return out;
  },
};

export const summaryLengthRule: Rule = {
  id: "CNT-004",
  description: "The professional summary should be present and concise.",
  category: "content",
  severity: "info",
  evaluate: (ctx) => {
    const text = ctx.cv.summary.trim();
    if (!text) {
      return [
        {
          message: msg(ctx, {
            en: "Add a short professional summary (2–4 sentences).",
            km: "សូមបន្ថែមសេចក្តីសង្ខេបអំពីខ្លួនអ្នក (២–៤ ប្រយោគ)។",
          }),
          field: "summary",
          section: "summary",
        },
      ];
    }
    if (text.length > 700) {
      return [
        {
          message: msg(ctx, {
            en: "The summary is long. Aim for 2–4 sentences.",
            km: "សេចក្តីសង្ខេបវែងពេក។ គួរមានត្រឹម ២–៤ ប្រយោគ។",
          }),
          field: "summary",
          section: "summary",
        },
      ];
    }
    return [];
  },
};

export const contentRules: Rule[] = [vagueContentRule, shortDescriptionRule, informalLanguageRule, summaryLengthRule];
