import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";
import { extractDocxLines } from "./extract-docx";
import { extractPdfLines, loadPdfJs } from "./extract-pdf";
import { linesFromPages, type PageItems } from "./layout";
import type { Line } from "./lines";
import { parseCVLines } from "./recognize";
import { ImportError, MAX_IMPORT_BYTES, type ImportOptions, type ImportResult, type ImportSource, type ImportWarning, type ImportedCV } from "./types";

export * from "./types";
export type { Line } from "./lines";
export { extractDocxLines } from "./extract-docx";
export { extractPdfLines } from "./extract-pdf";
export { parseCVLines, parseCVText } from "./recognize";
export { findDates } from "./dates";
export { OCR_DOWNLOAD_BYTES, OCR_MODEL_BASE, modelsAreCached, type OcrOptions, type OcrProgress, type OrtModule } from "./ocr";

const IMAGE_NAME = /\.(png|jpe?g|jfif|webp|gif|bmp|avif|heic|heif|tiff?|svg)$/;

/** Decide the file kind from its name and MIME type. Returns null for anything that is not a PDF, a DOCX or a picture. */
export function detectImportSource(file: { name?: string; type?: string }): ImportSource | null {
  const name = (file.name ?? "").toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return "docx";
  if ((file.type ?? "").startsWith("image/") || IMAGE_NAME.test(name)) return "image";
  return null;
}

/** What the bytes really are, whatever the file is called. */
function sniff(bytes: Uint8Array): ImportSource | null {
  const head = String.fromCharCode(...bytes.subarray(0, 1024));
  if (head.includes("%PDF-")) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "docx";
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  const picture =
    starts(0x89, 0x50, 0x4e, 0x47) || // PNG
    starts(0xff, 0xd8, 0xff) || // JPEG
    head.startsWith("GIF8") ||
    head.startsWith("BM") ||
    (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") ||
    head.slice(4, 8) === "ftyp" || // AVIF, HEIC
    starts(0x49, 0x49, 0x2a, 0x00) || // TIFF
    starts(0x4d, 0x4d, 0x00, 0x2a) ||
    /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/.test(head);
  return picture ? "image" : null;
}

/** Khmer that came out of the file damaged: unmapped glyphs, or vowels written before their consonant. */
function garbledShare(raw: string): number {
  const khmer = (raw.match(/[\u1780-\u17FF]/g) ?? []).length;
  // Symbol-font bullets at the start of a line are private-use characters too, and harmless.
  const unmapped = (raw.replace(/^\s*[\uF000-\uF0FF](?=\s)/gm, "").match(/[\u0000-\u0008\uFFFD\uE000-\uF8FF]/g) ?? []).length;
  const misplaced = (raw.match(/(?:^|[\s.,;:()\u0000-\u0008])[\u17B6-\u17D3]/g) ?? []).length;
  if (khmer < 20) return unmapped > Math.max(5, raw.length * 0.02) ? 1 : 0;
  return (unmapped + misplaced) / khmer;
}

const lengthOf = (lines: Line[]) => lines.map((l) => (l.right ? `${l.text} ${l.right}` : l.text)).join("").replace(/\s/g, "").length;

/** Turn the lines of a document into the result the app shows, noting when little of it could be placed. */
function recognise(source: ImportSource, lines: Line[], warnings: ImportWarning[]): ImportResult {
  const data = parseCVLines(lines);
  const placed = data.experiences.length + data.education.length + data.projects.length + data.skills.length + data.languages.length + data.certifications.length + (data.summary ? 1 : 0);
  if (placed === 0 || (!data.personal.fullName && placed < 2)) warnings.push("low-confidence");
  return { source, data, textLength: lengthOf(lines), warnings: [...new Set(warnings)] };
}

/** The result for pages that were read as pictures. */
async function fromPictures(source: ImportSource, read: () => Promise<PageItems[]>): Promise<ImportResult> {
  let pages: PageItems[];
  try {
    pages = await read();
  } catch (error) {
    if (error instanceof ImportError) throw error;
    const reason = (error as { name?: string; reason?: string })?.name === "OcrError" ? (error as { reason?: string }).reason : undefined;
    throw new ImportError(reason === "undecodable" ? "image-unreadable" : "reader-unavailable");
  }
  const { lines } = linesFromPages(pages);
  if (lengthOf(lines) < 20) throw new ImportError("no-text");
  return recognise(source, lines, ["read-from-image"]);
}

/** Read already-loaded bytes. Exposed for tests and scripts; the app uses importCVFile. */
export async function importCVBytes(bytes: Uint8Array, options: ImportOptions = {}): Promise<ImportResult> {
  if (bytes.length > MAX_IMPORT_BYTES) throw new ImportError("too-large");
  if (bytes.length < 8) throw new ImportError("corrupt");
  const source = sniff(bytes);
  if (!source) throw new ImportError("unsupported-type");
  const { ocr } = options;

  if (source === "image") {
    // Without a reader for pictures (tests, scripts) an image is simply not a file we can import.
    if (!ocr) throw new ImportError("unsupported-type");
    const { readImage } = await import("./ocr");
    return fromPictures(source, () => readImage(new Blob([bytes as BlobPart]), ocr));
  }
  if (source === "docx") {
    const lines = await extractDocxLines(bytes);
    if (lengthOf(lines) < 20) throw new ImportError("no-text");
    return recognise(source, lines, []);
  }

  const pdf = await extractPdfLines(bytes, options);
  const textLength = lengthOf(pdf.lines);
  // Damaged text would fill the CV with wrong letters: better to say so than to import it.
  const damage = garbledShare(pdf.raw);
  // A scan has no text to speak of; some have a stray line or two (a stamp, a page number).
  const scanned = textLength < 20 || (ocr !== undefined && textLength < pdf.pages * 60);
  if (scanned || damage > 0.08) {
    if (!ocr) throw new ImportError(textLength < 20 ? "no-text" : "garbled");
    // Look at the pages instead, the way a person would.
    const [{ readPdfPages }, pdfjs] = await Promise.all([import("./ocr"), loadPdfJs(options)]);
    return fromPictures(source, () => readPdfPages(bytes, pdfjs, ocr, options.pdfWasmUrl));
  }
  if (damage > 0.01) pdf.warnings.push("khmer-garbled");
  return recognise(source, pdf.lines, pdf.warnings);
}

/**
 * Read an existing CV (a PDF, a DOCX, or with `options.ocr` a picture) entirely on this device and
 * recognize its contents. Throws ImportError with a code the interface can explain.
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
