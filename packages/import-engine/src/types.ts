import type {
  Award,
  CVLanguage,
  Certification,
  Education,
  Experience,
  LanguageSkill,
  PersonalInformation,
  Project,
  SkillGroup,
} from "@thaflow/cv-core";

import type { OcrOptions } from "./ocr";

/** File kinds an existing CV can be read from. A picture is a photo, a screenshot or a scan saved as an image. */
export type ImportSource = "pdf" | "docx" | "image";

/** Largest file accepted, checked before any parsing. Phone photos run to several megabytes. */
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

/**
 * What was recognized in an existing CV. Only information actually present in
 * the file appears here: nothing is guessed or filled in. Every list item has a
 * fresh id. The person reviews all of it before it becomes their CV.
 */
export interface ImportedCV {
  /** Dominant language of the text. */
  language: CVLanguage;
  personal: Partial<PersonalInformation>;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: SkillGroup[];
  projects: Project[];
  certifications: Certification[];
  languages: LanguageSkill[];
  awards: Award[];
  /** Text blocks that could not be assigned to a section. Never silently merged into another field. */
  unplaced: string[];
}

export type ImportWarning =
  /** Two-column or unusual layout: reading order may be wrong. */
  | "layout-uncertain"
  /** Khmer text came out of the file damaged (common with PDFs that lack proper text encoding). */
  | "khmer-garbled"
  /** Text was found but very little could be assigned to CV sections. */
  | "low-confidence"
  /** The text was read from a picture of the page, so letters may be wrong here and there. */
  | "read-from-image";

export interface ImportResult {
  source: ImportSource;
  data: ImportedCV;
  /** Characters of text extracted from the file. */
  textLength: number;
  warnings: ImportWarning[];
}

export type ImportErrorCode =
  /** Not a PDF, a DOCX or a picture. */
  | "unsupported-type"
  /** Larger than MAX_IMPORT_BYTES. */
  | "too-large"
  /** The file has no selectable text (for example a scanned PDF). */
  | "no-text"
  /** Password-protected. */
  | "encrypted"
  /** Could not be opened. */
  | "corrupt"
  /** The text layer is damaged (typical of Khmer in PDFs): what could be read would be wrong. */
  | "garbled"
  /** A picture in a format this browser cannot open. */
  | "image-unreadable"
  /** The reader for pictures and scans could not be started (first use needs a connection to fetch it). */
  | "reader-unavailable";

export class ImportError extends Error {
  constructor(public readonly code: ImportErrorCode) {
    super(`Could not import CV: ${code}`);
    this.name = "ImportError";
  }
}

export interface ImportOptions {
  /** URL of the pdf.js worker script served from the app's own origin. Required for PDFs in the browser. */
  pdfWorkerSrc?: string;
  /** Folder (ending in "/") with pdf.js's image decoders, needed to draw some scanned PDFs. */
  pdfWasmUrl?: string;
  /**
   * How to read pictures: photos, screenshots, and PDFs without usable text. Without it those files
   * are refused with a clear error, as before. Browser only.
   */
  ocr?: OcrOptions;
}
