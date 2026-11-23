import { createEmptyCV, createEducation, createExperience, createId, type CVDocument } from "@thaflow/cv-core";
import { ImportError, MAX_IMPORT_BYTES, type ImportOptions, type ImportResult, type ImportSource, type ImportedCV } from "./types";

export * from "./types";

/** Decide the file kind from its name and MIME type. Returns null for anything that is not a PDF or DOCX. */
export function detectImportSource(file: { name?: string; type?: string }): ImportSource | null {
  const name = (file.name ?? "").toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return "docx";
  return null;
}

/**
 * Read an existing CV (PDF or DOCX) entirely on this device and recognize its
 * contents. Throws ImportError with a code the interface can explain.
 *
 * PLACEHOLDER IMPLEMENTATION: returns fixed sample data so the interface can be
 * built against the real contract. It does not read the file yet.
 */
export async function importCVFile(file: File, _options: ImportOptions = {}): Promise<ImportResult> {
  const source = detectImportSource(file);
  if (!source) throw new ImportError("unsupported-type");
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("too-large");
  if (file.size === 0) throw new ImportError("corrupt");
  const data: ImportedCV = {
    language: "en",
    personal: { fullName: "Sample Person", email: "sample@example.com", phone: "+855 12 345 678", location: "Phnom Penh" },
    summary: "Placeholder summary from the import stub.",
    experiences: [{ ...createExperience(), position: "Sales Assistant", company: "Sample Co", startDate: "2022-03", endDate: "2024-01", description: "Served customers." }],
    education: [{ ...createEducation(), institution: "Sample University", degree: "Bachelor", fieldOfStudy: "Business", endDate: "2021" }],
    skills: [{ id: createId(), category: "", skills: [{ id: createId(), name: "Excel" }, { id: createId(), name: "Customer service" }] }],
    projects: [],
    certifications: [],
    languages: [{ id: createId(), name: "Khmer" }, { id: createId(), name: "English" }],
    awards: [],
    unplaced: [],
  };
  return { source, data, textLength: 0, warnings: [] };
}

/** Whether an import found anything worth showing. */
export function isImportEmpty(data: ImportedCV): boolean {
  return (
    !data.personal.fullName &&
    !data.personal.email &&
    !data.personal.phone &&
    !data.summary.trim() &&
    data.experiences.length + data.education.length + data.projects.length + data.certifications.length + data.languages.length + data.awards.length === 0 &&
    data.skills.every((g) => g.skills.length === 0)
  );
}

/**
 * Start a new CV from imported data. `base` supplies everything the file does
 * not (ids, appearance, metadata); imported values replace the matching fields.
 */
export function createCVFromImport(data: ImportedCV, base: CVDocument = createEmptyCV({ language: data.language })): CVDocument {
  return {
    ...base,
    metadata: { ...base.metadata, language: data.language },
    personal: { ...base.personal, ...data.personal, fullName: data.personal.fullName ?? base.personal.fullName },
    summary: data.summary || base.summary,
    experiences: data.experiences,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    certifications: data.certifications,
    languages: data.languages,
    awards: data.awards,
  };
}
