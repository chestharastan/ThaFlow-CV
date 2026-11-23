import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";
import { extractDocxLines } from "./extract-docx";
import { extractPdfLines } from "./extract-pdf";
import type { Line } from "./lines";
import { parseCVLines } from "./recognize";
import { ImportError, MAX_IMPORT_BYTES, type ImportOptions, type ImportResult, type ImportSource, type ImportWarning, type ImportedCV } from "./types";

export * from "./types";
export type { Line } from "./lines";
export { extractDocxLines } from "./extract-docx";
export { extractPdfLines } from "./extract-pdf";
export { parseCVLines, parseCVText } from "./recognize";
export { findDates } from "./dates";

/** Decide the file kind from its name and MIME type. Returns null for anything that is not a PDF or DOCX. */
export function detectImportSource(file: { name?: string; type?: string }): ImportSource | null {
  const name = (file.name ?? "").toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return "docx";
  return null;
}

/** What the bytes really are, whatever the file is called. */
function sniff(bytes: Uint8Array): ImportSource | null {
  const head = String.fromCharCode(...bytes.subarray(0, 1024));
  if (head.includes("%PDF-")) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "docx";
  return null;
}

/** Khmer that came out of the file damaged: unmapped glyphs, or vowels written before their consonant. */
function garbledShare(raw: string): number {
  const khmer = (raw.match(/[\u1780-\u17FF]/g) ?? []).length;
  const unmapped = (raw.match(/[\u0000-\u0008\uFFFD\uE000-\uF8FF]/g) ?? []).length;
  const misplaced = (raw.match(/(?:^|[\s.,;:()\u0000-\u0008])[\u17B6-\u17D3]/g) ?? []).length;
  if (khmer < 20) return unmapped > Math.max(5, raw.length * 0.02) ? 1 : 0;
  return (unmapped + misplaced) / khmer;
}

/** Read already-loaded bytes. Exposed for tests and scripts; the app uses importCVFile. */
export async function importCVBytes(bytes: Uint8Array, options: ImportOptions = {}): Promise<ImportResult> {
  if (bytes.length > MAX_IMPORT_BYTES) throw new ImportError("too-large");
  if (bytes.length < 8) throw new ImportError("corrupt");
  const source = sniff(bytes);
  if (!source) throw new ImportError("unsupported-type");

  let lines: Line[];
  let raw = "";
  const warnings: ImportWarning[] = [];
  if (source === "pdf") {
    const pdf = await extractPdfLines(bytes, options);
    lines = pdf.lines;
    raw = pdf.raw;
    warnings.push(...pdf.warnings);
  } else {
    lines = await extractDocxLines(bytes);
    raw = lines.map((l) => l.text).join("\n");
  }
  const text = lines.map((l) => (l.right ? `${l.text} ${l.right}` : l.text)).join("\n");
  const textLength = text.replace(/\s/g, "").length;
  if (textLength < 20) throw new ImportError("no-text");

  // Damaged text would fill the CV with wrong letters: better to say so than to import it.
  const damage = garbledShare(raw);
  if (damage > 0.08) throw new ImportError("garbled");
  const data = parseCVLines(lines);
  if (damage > 0.01) warnings.push("khmer-garbled");
  const placed = data.experiences.length + data.education.length + data.projects.length + data.skills.length + data.languages.length + data.certifications.length + (data.summary ? 1 : 0);
  if (placed === 0 || (!data.personal.fullName && placed < 2)) warnings.push("low-confidence");
  return { source, data, textLength, warnings: [...new Set(warnings)] };
}

/**
 * Read an existing CV (PDF or DOCX) entirely on this device and recognize its
 * contents. Throws ImportError with a code the interface can explain.
 */
export async function importCVFile(file: File, options: ImportOptions = {}): Promise<ImportResult> {
  if (!detectImportSource(file)) throw new ImportError("unsupported-type");
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("too-large");
  if (file.size === 0) throw new ImportError("corrupt");
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new ImportError("corrupt");
  }
  return importCVBytes(bytes, options);
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
