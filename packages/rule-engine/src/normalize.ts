import type { CVLanguage, SkillGroup } from "@thaflow/cv-core";

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/​/g, "") // zero-width spaces pasted from Khmer documents
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Khmer if a meaningful share of letters are in the Khmer Unicode block. */
export function detectLanguage(text: string): CVLanguage {
  const khmer = (text.match(/[ក-៿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return khmer > 0 && khmer >= latin * 0.3 ? "km" : "en";
}

const skillKey = (name: string) => name.trim().toLowerCase().replace(/[\s._-]+/g, "");

export function findDuplicateSkills(groups: SkillGroup[]): string[] {
  const seen = new Set<string>();
  const dupes = new Map<string, string>();
  for (const group of groups) {
    for (const skill of group.skills) {
      const key = skillKey(skill.name);
      if (!key) continue;
      if (seen.has(key)) dupes.set(key, skill.name.trim());
      seen.add(key);
    }
  }
  return [...dupes.values()];
}

/** Remove duplicated skills, keeping the first occurrence. */
export function dedupeSkills(groups: SkillGroup[]): SkillGroup[] {
  const seen = new Set<string>();
  return groups.map((group) => ({
    ...group,
    skills: group.skills.filter((skill) => {
      const key = skillKey(skill.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  }));
}

/** Split a pasted skills list ("React, Node.js; SQL" or one per line). */
export function splitSkillList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,;\n•·|]|(?:\s-\s)/)
    .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
    .filter((s) => {
      const key = skillKey(s);
      if (!s || s.length > 60 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
