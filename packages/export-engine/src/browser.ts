import { serializeBackup, type CVDocument } from "@thaflow/cv-core";

/** Safe file name stem; keeps Khmer and other letters, drops path/control characters. */
export function fileNameFor(cv: CVDocument): string {
  const base = (cv.personal.fullName || cv.metadata.title || "cv")
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || "cv";
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBackup(cvs: CVDocument[], fileName: string): void {
  downloadBlob(new Blob([serializeBackup(cvs)], { type: "application/json" }), fileName);
}

/**
 * PDF export through the browser's own print engine ("Save as PDF"). The page
 * must include printCss so only the CV is printed. The document title becomes
 * the suggested PDF file name. Fonts are awaited so Khmer glyphs are embedded.
 */
export async function printToPDF(cv: CVDocument): Promise<void> {
  const previous = document.title;
  document.title = fileNameFor(cv);
  try {
    await document.fonts?.ready;
  } catch {
    /* printing still works with fallback fonts */
  }
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
