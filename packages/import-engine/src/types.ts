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

/** File kinds an existing CV can be read from. */
export type ImportSource = "pdf" | "docx";

/** Largest file accepted, checked before any parsing. */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

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
  | "low-confidence";

export interface ImportResult {
  source: ImportSource;
  data: ImportedCV;
  /** Characters of text extracted from the file. */
  textLength: number;
  warnings: ImportWarning[];
}

export type ImportErrorCode =
  /** Not a PDF or DOCX. */
  | "unsupported-type"
  /** Larger than MAX_IMPORT_BYTES. */
  | "too-large"
  /** The file has no selectable text (for example a scanned PDF). */
  | "no-text"
  /** Password-protected. */
  | "encrypted"
  /** Could not be opened. */
  | "corrupt";

export class ImportError extends Error {
  constructor(public readonly code: ImportErrorCode) {
    super(`Could not import CV: ${code}`);
    this.name = "ImportError";
  }
}

export interface ImportOptions {
  /** URL of the pdf.js worker script served from the app's own origin. Required for PDFs in the browser. */
  pdfWorkerSrc?: string;
}
