import type { CVDocument, SectionKey } from "@thaflow/cv-core";
import type { CVTemplate } from "./templates";

export function isSectionEmpty(cv: CVDocument, key: SectionKey): boolean {
  switch (key) {
    case "summary":
      return cv.summary.trim().length === 0;
    case "skills":
      return cv.skills.every((g) => g.skills.length === 0);
    case "customSections":
      return cv.customSections.every((s) => s.items.length === 0);
    default:
      return cv[key].length === 0;
  }
}

/**
 * The sections a renderer should output, in order. Shared by the HTML and DOCX
 * renderers so both formats always agree on content.
 */
export function getVisibleSections(cv: CVDocument, template: CVTemplate): SectionKey[] {
  return cv.appearance.sectionOrder.filter(
    (key) =>
      template.supportedSections.includes(key) &&
      !cv.appearance.hiddenSections.includes(key) &&
      !isSectionEmpty(cv, key),
  );
}

/** Sections that move into the sidebar on two-column templates. */
export const SIDEBAR_SECTIONS: SectionKey[] = ["skills", "languages", "certifications"];

/** Contact lines as plain text. URLs are never rendered as live links from user input. */
export function contactLines(cv: CVDocument): { kind: string; value: string }[] {
  const p = cv.personal;
  const strip = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const entries: [string, string | undefined][] = [
    ["email", p.email],
    ["phone", p.phone],
    ["location", p.location],
    ["website", p.website && strip(p.website)],
    ["linkedin", p.linkedin && strip(p.linkedin)],
    ["github", p.github && strip(p.github)],
  ];
  return entries
    .filter((e): e is [string, string] => Boolean(e[1]?.trim()))
    .map(([kind, value]) => ({ kind, value: value.trim() }));
}

/** Split a multi-line description into paragraphs/bullets. Lines starting with -, * or • become bullets. */
export function parseDescription(text: string | undefined): { paragraphs: string[]; bullets: string[] } {
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) bullets.push(bullet[1]!);
    else paragraphs.push(line);
  }
  return { paragraphs, bullets };
}
