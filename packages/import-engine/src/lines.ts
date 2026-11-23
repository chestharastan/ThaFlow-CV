/** One line of text taken from a document, with whatever layout hints the format gave us. */
export interface Line {
  text: string;
  /** Text set apart on the same line (after a tab in Word, or across a wide gap in a PDF): usually a date. */
  right?: string;
  /** Font size in points, when known. */
  size?: number;
  /** Set in a heavier or different face than the body text, when known. */
  emph?: boolean;
  /** Marked as a heading or title by the document itself (Word styles). */
  heading?: boolean;
  /** A list item. */
  bullet?: boolean;
  /** Left edge in points, when the format has geometry (PDF). */
  x?: number;
  /** The line runs to the right edge of its column, so the next line probably continues it (PDF). */
  wraps?: boolean;
}

const BULLET = /^\s*(?:[•·▪■●○◦‣∙*]|[–—-])\s+/;

export function isBulletText(text: string): boolean {
  return BULLET.test(text);
}

export function stripBullet(text: string): string {
  return text.replace(BULLET, "").trim();
}

/** Collapse runs of spaces but keep double spaces, which mark a visual gap between items. */
export function tidy(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B\u00AD\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{3,}/g, "  ")
    .trim();
}

/** "S U M M A R Y" → "SUMMARY": letter-spaced headings come out of a PDF one letter at a time. */
export function collapseSpaced(text: string): string {
  const tokens = text.trim().split(/ +/);
  const short = tokens.filter((t) => [...t].length <= 2).length;
  if (tokens.length < 4 || short / tokens.length < 0.6) return text;
  return text
    .trim()
    .split(/ {2,}/)
    .map((word) => word.replace(/ /g, ""))
    .join(" ");
}

/** Join a wrapped line to the one before it. Khmer wraps inside a phrase, where a space would be wrong. */
export function joinWrapped(previous: string, next: string): string {
  const khmer = /[\u1780-\u17FF]$/.test(previous) && /^[\u1780-\u17FF]/.test(next);
  return previous + (khmer ? "" : " ") + next;
}
