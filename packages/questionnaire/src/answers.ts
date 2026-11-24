import { PERSONAL_DETAIL_KEYS, createId, createSkillGroup, defaultSectionOrder, type CVDocument, type CVLanguage, type LanguageSkill } from "@thaflow/cv-core";
import type { QuestionId } from "./questions";

/**
 * Writing answers into the CV. Each function changes the document it is given,
 * so it can be passed straight to an immutable updater (which hands over a draft).
 */

/** The title a CV has until the person is known; replaced by their name as soon as they give it. */
const UNTITLED = "Untitled CV";

/** Set the name. The CV's own title follows the name until someone gives it a title of its own. */
export function setFullName(cv: CVDocument, name: string): void {
  const previous = cv.personal.fullName.trim();
  const title = cv.metadata.title.trim();
  cv.personal.fullName = name;
  if (!title || title === UNTITLED || title === previous) cv.metadata.title = name.trim() || UNTITLED;
}

/**
 * Remember the answer to "have you worked before?" in the CV: yes makes it a
 * professional CV, not yet a student one. The section order follows, so people
 * without work experience lead with their education.
 */
export function setWorked(cv: CVDocument, worked: boolean): void {
  const target = worked ? "professional" : "student";
  if (cv.metadata.target === target) return;
  cv.metadata.target = target;
  cv.appearance.sectionOrder = defaultSectionOrder(target);
}

/* ---------- Spoken languages ---------- */

export const LANGUAGE_LEVELS = ["native", "fluent", "good", "basic"] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

/** The words printed in the CV for each level. They follow the CV's language, not the interface language. */
const LEVEL_LABELS: Record<CVLanguage, Record<LanguageLevel, string>> = {
  en: { native: "Native", fluent: "Fluent", good: "Good", basic: "Basic" },
  km: { native: "ភាសាកំណើត", fluent: "ស្ទាត់ជំនាញ", good: "ល្អ", basic: "មូលដ្ឋាន" },
};

export function levelLabel(level: LanguageLevel, language: CVLanguage): string {
  return LEVEL_LABELS[language][level];
}

/** The level a stored proficiency stands for, in either language; null for anything else (kept as written). */
export function levelOf(proficiency: string | undefined): LanguageLevel | null {
  const text = proficiency?.trim().toLowerCase();
  if (!text) return null;
  for (const labels of Object.values(LEVEL_LABELS)) {
    for (const level of LANGUAGE_LEVELS) {
      if (labels[level].toLowerCase() === text) return level;
    }
  }
  return null;
}

/** Change the language the CV is written in. Level words already chosen are rewritten to match. */
export function setLanguage(cv: CVDocument, language: CVLanguage): void {
  cv.metadata.language = language;
  for (const spoken of cv.languages) {
    const level = levelOf(spoken.proficiency);
    if (level) spoken.proficiency = levelLabel(level, language);
  }
}

/** Replace the spoken languages. Rows without a name are dropped; a row keeps its id. */
export function setSpokenLanguages(cv: CVDocument, rows: readonly LanguageSkill[]): void {
  cv.languages = rows
    .filter((row) => row.name.trim())
    .map((row) => ({ id: row.id, name: row.name, proficiency: row.proficiency?.trim() || undefined }));
}

/* ---------- Skills ---------- */

const skillKey = (name: string) => name.trim().toLowerCase();

/** Every skill in the CV as one flat list, in the order it is printed. */
export function listSkills(cv: CVDocument): string[] {
  return cv.skills.flatMap((group) => group.skills.map((skill) => skill.name)).filter((name) => name.trim());
}

/**
 * Make the CV's skills match a flat list. Skills that are still listed keep
 * their group, id and level; new ones join the last group; groups left empty
 * are removed.
 */
export function setSkills(cv: CVDocument, names: readonly string[]): void {
  const wanted = new Map<string, string>();
  for (const name of names) {
    if (name.trim() && !wanted.has(skillKey(name))) wanted.set(skillKey(name), name.trim());
  }
  const kept = new Set<string>();
  for (const group of cv.skills) {
    group.skills = group.skills.filter((skill) => {
      const key = skillKey(skill.name);
      if (!wanted.has(key) || kept.has(key)) return false;
      kept.add(key);
      return true;
    });
  }
  const added = [...wanted].filter(([key]) => !kept.has(key)).map(([, name]) => ({ id: createId(), name }));
  cv.skills = cv.skills.filter((group) => group.skills.length > 0);
  if (added.length === 0) return;
  const last = cv.skills[cv.skills.length - 1];
  if (last) last.skills.push(...added);
  else cv.skills.push({ ...createSkillGroup(), skills: added });
}

/* ---------- Leaving a question ---------- */

const trimmed = (value: string | undefined) => value?.trim() || undefined;

/** Tidy what was typed when a question is left: stray spaces go, nothing else changes. */
export function tidyAnswer(cv: CVDocument, id: QuestionId): void {
  switch (id) {
    case "name":
      setFullName(cv, cv.personal.fullName.trim());
      break;
    case "title":
      cv.personal.headline = trimmed(cv.personal.headline);
      break;
    case "contact":
      cv.personal.email = trimmed(cv.personal.email);
      cv.personal.phone = trimmed(cv.personal.phone);
      cv.personal.location = trimmed(cv.personal.location);
      break;
    case "details":
      for (const key of PERSONAL_DETAIL_KEYS) cv.personal[key] = trimmed(cv.personal[key]);
      break;
    case "about":
      cv.summary = cv.summary.trim();
      break;
    default:
      break;
  }
}
