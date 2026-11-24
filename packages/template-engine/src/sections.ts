import {
  GENDERS,
  MARITAL_STATUSES,
  PERSONAL_DETAIL_KEYS,
  formatFullDate,
  hasPersonalDetails,
  type CVDocument,
  type CVLanguage,
  type Education,
  type Experience,
  type SectionKey,
} from "@thaflow/cv-core";
import type { CVLabels, FieldKey } from "@thaflow/localization";
import type { CVTemplate, EntryLead } from "./templates";

export function isSectionEmpty(cv: CVDocument, key: SectionKey): boolean {
  switch (key) {
    case "summary":
      return cv.summary.trim().length === 0;
    case "personalDetails":
      return !hasPersonalDetails(cv.personal);
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

/** Sections that fill the second column of a "split" template; the summary runs full width above both. */
export const SPLIT_SIDE_SECTIONS: SectionKey[] = ["personalDetails", "education", "skills", "certifications", "languages", "awards"];

export interface SectionPlacement {
  /** Sections the header prints itself ("sheet" headers fold the personal details into their rows). */
  header: SectionKey[];
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
  const all = getVisibleSections(cv, template);
  const header = all.filter((s) => template.style.header === "sheet" && s === "personalDetails");
  const visible = all.filter((s) => !header.includes(s));
  const { kind, sideSections } = template.layout;
  if (kind === "sidebar-left" || kind === "sidebar-right") {
    // The sidebar always carries the contact block or the photo, so it is never empty.
    const side = visible.filter((s) => sideSections.includes(s));
    return { header, lead: [], main: visible.filter((s) => !side.includes(s)), side, twoColumn: true };
  }
  if (kind === "split") {
    const lead = visible.filter((s): s is SectionKey => s === "summary");
    const side = visible.filter((s) => SPLIT_SIDE_SECTIONS.includes(s));
    const main = visible.filter((s) => !lead.includes(s) && !side.includes(s));
    if (main.length > 0 && side.length > 0) return { header, lead, main, side, twoColumn: true };
  }
  return { header, lead: [], main: visible, side: [], twoColumn: false };
}

/** Whether the header itself carries the contact details. Elsewhere they are a section of the side column. */
export function contactInHeader(template: CVTemplate): boolean {
  return !template.layout.sidebar || template.style.header === "profile";
}

export type ContactKind = "email" | "phone" | "location" | "website" | "linkedin" | "github";

/** Contact lines as plain text. URLs are never rendered as live links from user input. */
export function contactLines(cv: CVDocument): { kind: ContactKind; value: string }[] {
  const p = cv.personal;
  const strip = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const entries: [ContactKind, string | undefined][] = [
    ["email", p.email],
    ["phone", p.phone],
    ["location", p.location],
    ["website", p.website && strip(p.website)],
    ["linkedin", p.linkedin && strip(p.linkedin)],
    ["github", p.github && strip(p.github)],
  ];
  return entries
    .filter((e): e is [ContactKind, string] => Boolean(e[1]?.trim()))
    .map(([kind, value]) => ({ kind, value: value.trim() }));
}

/** The row label of each contact detail. */
export const CONTACT_FIELD: Record<ContactKind, FieldKey> = {
  email: "email",
  phone: "phone",
  location: "address",
  website: "website",
  linkedin: "linkedin",
  github: "github",
};

/* ---------- Rows: "label : value" ---------- */

export interface FieldRow {
  key: FieldKey;
  label: string;
  value: string;
}

const coded = <T extends string>(codes: readonly T[], words: Record<T, string>, value: string): string => {
  const code = codes.find((c) => c === value.trim().toLowerCase());
  return code ? words[code] : value.trim();
};

/**
 * The personal details that were filled in, as printed: answers stored as a
 * code ("female", "single") in the CV's language, the date of birth written
 * out, everything else as the person wrote it. Shared by the HTML and DOCX renderers.
 */
export function personalDetailRows(cv: CVDocument, labels: CVLabels): FieldRow[] {
  const lang = cv.metadata.language;
  const rows: FieldRow[] = [];
  for (const key of PERSONAL_DETAIL_KEYS) {
    const raw = cv.personal[key]?.trim();
    if (!raw) continue;
    const value =
      key === "gender"
        ? coded(GENDERS, labels.gender, raw)
        : key === "maritalStatus"
          ? coded(MARITAL_STATUSES, labels.maritalStatus, raw)
          : key === "dateOfBirth"
            ? formatFullDate(raw, lang)
            : raw;
    rows.push({ key, label: labels.fields[key], value });
  }
  return rows;
}

/**
 * Who the person is and how to reach them, as rows, for headers that print
 * "label : value". The name row is always there; the rest only when filled in.
 * A "sheet" header also takes the personal details, between identity and contact.
 */
export function identityRows(cv: CVDocument, labels: CVLabels, details: FieldRow[] = []): FieldRow[] {
  const { fullName, headline } = cv.personal;
  const contact = contactLines(cv);
  const row = (kind: ContactKind): FieldRow[] =>
    contact.filter((l) => l.kind === kind).map((l) => ({ key: CONTACT_FIELD[kind], label: labels.fields[CONTACT_FIELD[kind]], value: l.value }));
  return [
    { key: "name", label: labels.fields.name, value: fullName },
    ...(headline?.trim() ? [{ key: "position" as const, label: labels.fields.position, value: headline.trim() }] : []),
    ...details,
    ...row("location"),
    ...row("phone"),
    ...row("email"),
    ...row("website"),
    ...row("linkedin"),
    ...row("github"),
  ];
}

const LINK_KINDS = new Set<ContactKind>(["website", "linkedin", "github"]);

/**
 * Contact details grouped into display rows: how to reach the person, then
 * their links. Up to three details stay on one row.
 */
export function contactRows(cv: CVDocument): { kind: ContactKind; value: string }[][] {
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
