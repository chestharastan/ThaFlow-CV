import { dateToMonths, type CVDocument } from "@thaflow/cv-core";

const listEn = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const listKm = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} និង ${items[items.length - 1]}`);
const clean = (items: (string | undefined)[]) => [...new Set(items.map((s) => s?.trim() ?? "").filter(Boolean))];

/** Whole years between the first job starting and the last one ending (or today). */
function yearsOfExperience(cv: CVDocument, now: Date): number {
  const starts = cv.experiences.map((e) => dateToMonths(e.startDate)).filter((m): m is number => m !== null);
  if (starts.length === 0) return 0;
  const today = now.getFullYear() * 12 + now.getMonth();
  const ends = cv.experiences.map((e) => (e.isCurrent ? today : (dateToMonths(e.endDate, true) ?? dateToMonths(e.startDate)))).filter((m): m is number => m !== null);
  return Math.max(0, Math.floor((Math.min(today, Math.max(...ends)) - Math.min(...starts) + 1) / 12));
}

/**
 * Write a first draft of the summary from what is already in the CV. It is
 * assembled from the person's own facts with fixed sentence patterns: nothing
 * is invented, and it works with no AI and no connection. Returns "" when the
 * CV does not yet say enough to write anything.
 */
export function draftSummary(cv: CVDocument, now: Date = new Date()): string {
  const km = cv.metadata.language === "km";
  const title = cv.personal.headline?.trim() || cv.experiences[0]?.position.trim() || "";
  const companies = clean(cv.experiences.map((e) => e.company)).slice(0, 2);
  const years = yearsOfExperience(cv, now);
  const school = cv.education[0];
  const degree = school?.degree?.trim() ?? "";
  const field = school?.fieldOfStudy?.trim() ?? "";
  const institution = school?.institution.trim() ?? "";
  const skills = clean(cv.skills.flatMap((g) => g.skills.map((s) => s.name))).slice(0, 4);
  const languages = clean(cv.languages.map((l) => l.name)).slice(0, 4);
  const sentences: string[] = [];

  if (km) {
    if (title) {
      const experience = years >= 1 ? ` ដែលមានបទពិសោធន៍ការងារ ${years} ឆ្នាំ` : cv.experiences.length ? " ដែលមានបទពិសោធន៍ការងារ" : "";
      sentences.push(`${title}${experience}${companies.length ? ` នៅ${listKm(companies)}` : ""}។`);
    } else if (years >= 1) sentences.push(`មានបទពិសោធន៍ការងារ ${years} ឆ្នាំ${companies.length ? ` នៅ${listKm(companies)}` : ""}។`);
    if (degree) sentences.push(`បានបញ្ចប់${degree}${field ? ` ផ្នែក${field}` : ""}${institution ? ` ពី${institution}` : ""}។`);
    else if (field || institution) sentences.push(`បានសិក្សា${field ? `ផ្នែក${field}` : ""}${institution ? ` នៅ${institution}` : ""}។`);
    if (skills.length) sentences.push(`មានជំនាញ ${listKm(skills)}។`);
    if (languages.length) sentences.push(`ចេះភាសា${listKm(languages)}។`);
    return sentences.join(" ");
  }

  if (title) {
    const experience = years >= 1 ? ` with ${years} year${years > 1 ? "s" : ""} of experience` : cv.experiences.length ? " with experience" : "";
    sentences.push(`${title}${experience}${companies.length ? ` at ${listEn(companies)}` : ""}.`);
  } else if (years >= 1) sentences.push(`${years} year${years > 1 ? "s" : ""} of experience${companies.length ? ` at ${listEn(companies)}` : ""}.`);
  if (degree) sentences.push(`Holds ${/^[aeiou]/i.test(degree) ? "an" : "a"} ${degree}${field ? ` in ${field}` : ""}${institution ? ` from ${institution}` : ""}.`);
  else if (field || institution) sentences.push(`Studied ${field}${field && institution ? " at " : ""}${!field && institution ? "at " : ""}${institution}.`);
  if (skills.length) sentences.push(`Skilled in ${listEn(skills)}.`);
  if (languages.length) sentences.push(`Speaks ${listEn(languages)}.`);
  return sentences.join(" ");
}
