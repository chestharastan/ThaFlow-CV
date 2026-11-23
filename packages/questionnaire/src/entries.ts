import { dateToMonths, type CVDocument, type Education, type Experience, type Project } from "@thaflow/cv-core";
import type { QuestionId } from "./questions";
import type { Issue } from "./validation";

/**
 * The three questions answered with a list of entries (jobs, schools,
 * projects), each filled in on its own screen.
 */
export const ENTRY_SECTIONS = ["work", "education", "projects"] as const;
export type EntrySectionId = (typeof ENTRY_SECTIONS)[number];

export interface EntryTypes {
  work: Experience;
  education: Education;
  projects: Project;
}
export type EntryOf<S extends EntrySectionId> = EntryTypes[S];

const LIST_KEY = { work: "experiences", education: "education", projects: "projects" } as const;

export function isEntrySection(id: QuestionId): id is EntrySectionId {
  return (ENTRY_SECTIONS as readonly string[]).includes(id);
}

export function entriesOf<S extends EntrySectionId>(cv: CVDocument, section: S): EntryOf<S>[] {
  return cv[LIST_KEY[section]] as EntryOf<S>[];
}

/** An empty entry with a known id. It only becomes part of the CV once something is typed into it. */
export function blankEntry<S extends EntrySectionId>(section: S, id: string): EntryOf<S> {
  const entries: EntryTypes = {
    work: { id, company: "", position: "", isCurrent: false, description: "", achievements: [], technologies: [] },
    education: { id, institution: "", achievements: [] },
    projects: { id, name: "", description: "", technologies: [] },
  };
  return entries[section];
}

const empty = (...values: (string | undefined)[]) => values.every((value) => !value || !value.trim());

/** Whether nothing has been entered. Blank entries are never stored. */
export function isBlankEntry<S extends EntrySectionId>(section: S, entry: EntryOf<S>): boolean {
  switch (section) {
    case "work": {
      const job = entry as Experience;
      return (
        empty(job.position, job.company, job.description, job.location, job.startDate, job.endDate) &&
        !job.isCurrent &&
        job.achievements.length === 0 &&
        job.technologies.length === 0
      );
    }
    case "education": {
      const school = entry as Education;
      return (
        empty(school.institution, school.degree, school.fieldOfStudy, school.location, school.description, school.startDate, school.endDate) &&
        school.achievements.length === 0
      );
    }
    default: {
      const project = entry as Project;
      return (
        empty(project.name, project.description, project.role, project.url, project.startDate, project.endDate) &&
        project.technologies.length === 0
      );
    }
  }
}

/**
 * Write an entry into the CV as it is typed: replaced in place when it is
 * already there, added at the end (oldest last) when it is new, and taken out
 * again if everything in it has been cleared.
 */
export function upsertEntry<S extends EntrySectionId>(cv: CVDocument, section: S, entry: EntryOf<S>): void {
  const list = entriesOf(cv, section);
  const at = list.findIndex((existing) => existing.id === entry.id);
  if (isBlankEntry(section, entry)) {
    if (at >= 0) list.splice(at, 1);
  } else if (at >= 0) {
    list[at] = entry;
  } else {
    list.push(entry);
  }
}

export function removeEntry(cv: CVDocument, section: EntrySectionId, id: string): void {
  const list = entriesOf(cv, section);
  const at = list.findIndex((existing) => existing.id === id);
  if (at >= 0) list.splice(at, 1);
}

/** The entry with this id, or a blank one to start typing into. */
export function entryFor<S extends EntrySectionId>(cv: CVDocument, section: S, id: string): EntryOf<S> {
  return entriesOf(cv, section).find((existing) => existing.id === id) ?? blankEntry(section, id);
}

/**
 * Which screen an entries question shows.
 *
 * - "entry": the form for one entry, when one is open or (for optional
 *   sections) there is nothing yet, so the first entry is asked for directly.
 * - "list": the entries so far, with edit, remove and add another.
 * - "ask": work only, with no jobs yet: "have you worked before?".
 */
export type SectionScreen = "ask" | "entry" | "list";

export function sectionScreen(cv: CVDocument, section: EntrySectionId, openEntryId?: string | null): SectionScreen {
  if (openEntryId) return "entry";
  if (entriesOf(cv, section).length > 0) return "list";
  return section === "work" ? "ask" : "entry";
}

const trimmed = (value: string | undefined) => value?.trim() || undefined;

/** The entry with stray spaces removed, as it is kept when its screen is left. */
export function tidyEntry<S extends EntrySectionId>(section: S, entry: EntryOf<S>): EntryOf<S> {
  switch (section) {
    case "work": {
      const job = entry as Experience;
      return { ...job, position: job.position.trim(), company: job.company.trim(), description: job.description.trim() } as EntryOf<S>;
    }
    case "education": {
      const school = entry as Education;
      return {
        ...school,
        institution: school.institution.trim(),
        degree: trimmed(school.degree),
        fieldOfStudy: trimmed(school.fieldOfStudy),
      } as EntryOf<S>;
    }
    default: {
      const project = entry as Project;
      return { ...project, name: project.name.trim(), description: project.description.trim() } as EntryOf<S>;
    }
  }
}

function dateOrderIssue(start: string | undefined, end: string | undefined): Issue[] {
  const from = dateToMonths(start);
  const to = dateToMonths(end, true);
  return from !== null && to !== null && to < from ? [{ field: "endDate", code: "date-order" }] : [];
}

/**
 * What stops an entry from being kept. An entry needs something to call it by
 * (a job title or company; a school or degree; a project name) and must not
 * end before it starts.
 */
export function validateEntry<S extends EntrySectionId>(section: S, entry: EntryOf<S>): Issue[] {
  switch (section) {
    case "work": {
      const job = entry as Experience;
      return [
        ...(empty(job.position, job.company) ? [{ field: "position", code: "required" } as Issue] : []),
        ...(job.isCurrent ? [] : dateOrderIssue(job.startDate, job.endDate)),
      ];
    }
    case "education": {
      const school = entry as Education;
      return [
        ...(empty(school.institution, school.degree) ? [{ field: "institution", code: "required" } as Issue] : []),
        ...dateOrderIssue(school.startDate, school.endDate),
      ];
    }
    default: {
      const project = entry as Project;
      return empty(project.name) ? [{ field: "name", code: "required" }] : [];
    }
  }
}
