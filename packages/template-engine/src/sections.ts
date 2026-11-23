import type { CVDocument, CVLanguage, Education, Experience, SectionKey } from "@thaflow/cv-core";
import type { CVTemplate, EntryLead } from "./templates";

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

/** Sections that move into the sidebar on sidebar templates. */
export const SIDEBAR_SECTIONS: SectionKey[] = ["skills", "languages", "certifications"];

/** Sections that fill the second column of a "split" template; the summary runs full width above both. */
export const SPLIT_SIDE_SECTIONS: SectionKey[] = ["education", "skills", "certifications", "languages", "awards"];

export interface SectionPlacement {
  /** Full-width sections above the columns (split layout only). */
  lead: SectionKey[];
  /** The main column, or everything on one-column templates. */
  main: SectionKey[];
  /** The sidebar or second column. */
  side: SectionKey[];
  /** False when a two-column template has nothing for one of its columns and renders as one. */
  twoColumn: boolean;
}

/** Where each visible section goes for a template's page layout. Order within a column follows the CV. */
export function placeSections(cv: CVDocument, template: CVTemplate): SectionPlacement {
  const visible = getVisibleSections(cv, template);
  const { kind } = template.layout;
  if (kind === "sidebar-left" || kind === "sidebar-right") {
    // The sidebar always carries the contact block, so it is never empty.
    const side = visible.filter((s) => SIDEBAR_SECTIONS.includes(s));
    return { lead: [], main: visible.filter((s) => !side.includes(s)), side, twoColumn: true };
  }
  if (kind === "split") {
    const lead = visible.filter((s): s is SectionKey => s === "summary");
    const side = visible.filter((s) => SPLIT_SIDE_SECTIONS.includes(s));
    const main = visible.filter((s) => !lead.includes(s) && !side.includes(s));
    if (main.length > 0 && side.length > 0) return { lead, main, side, twoColumn: true };
  }
  return { lead: [], main: visible, side: [], twoColumn: false };
}

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

const LINK_KINDS = new Set(["website", "linkedin", "github"]);

/**
 * Contact details grouped into display rows: how to reach the person, then
 * their links. Up to three details stay on one row.
 */
export function contactRows(cv: CVDocument): { kind: string; value: string }[][] {
  const lines = contactLines(cv);
  if (lines.length <= 3) return lines.length > 0 ? [lines] : [];
  const direct = lines.filter((l) => !LINK_KINDS.has(l.kind));
  const links = lines.filter((l) => LINK_KINDS.has(l.kind));
  return [direct, links].filter((row) => row.length > 0);
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

const KHMER = /[ក-៿᧠-᧿]/;

export function hasKhmer(text: string | undefined): boolean {
  return Boolean(text && KHMER.test(text));
}

/**
 * The `lang` to put on an element holding `text`, or undefined when it matches
 * the CV's language. Khmer inside an English CV is tagged so the Khmer rules
 * (no letter-spacing, no italics, taller lines) apply to it too.
 */
export function langOf(text: string | undefined, cvLanguage: CVLanguage): "km" | undefined {
  return cvLanguage !== "km" && hasKhmer(text) ? "km" : undefined;
}

/** Up to two initials for the monogram header. Khmer names use the first consonant of each word. */
export function initialsOf(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0]!)[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1]!)[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Join the non-empty parts. */
export function joinParts(parts: (string | undefined)[], separator = " · "): string {
  return parts.filter((p) => p?.trim()).join(separator);
}

/**
 * The two heading lines of an experience entry. "role" templates lead with the
 * position, "org" templates with the employer; the other becomes the subtitle,
 * followed by the location. A missing lead falls back to the other so the entry
 * always has a title.
 */
export function experienceLines(e: Experience, lead: EntryLead): { title: string; subtitle: string } {
  const [first, second] = lead === "org" ? [e.company, e.position] : [e.position, e.company];
  return { title: first || second, subtitle: joinParts([first ? second : "", e.location]) };
}

/** As experienceLines, for education: the degree (with field of study) or the institution leads. */
export function educationLines(e: Education, lead: EntryLead): { title: string; subtitle: string } {
  const degree = joinParts([e.degree, e.fieldOfStudy], ", ");
  const [first, second] = lead === "org" ? [e.institution, degree] : [degree, e.institution];
  return { title: first || second, subtitle: joinParts([first ? second : "", e.location]) };
}
