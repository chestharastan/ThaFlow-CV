import { ImportError, type ImportOptions, type ImportWarning } from "./types";
import { linesFromPages, type Item, type PageItems } from "./layout";
import type { Line } from "./lines";

const MAX_PAGES = 20;

type PdfJs = typeof import("pdfjs-dist");

export async function loadPdfJs(options: ImportOptions): Promise<PdfJs> {
  if (typeof window === "undefined") {
    // Node (tests, scripts): the legacy build runs without a worker or DOM. The specifier is a
    // variable so browser bundlers do not pull this build into the app.
    const legacy = "pdfjs-dist/legacy/build/pdf.mjs";
    return (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ legacy)) as PdfJs;
  }
  const pdfjs = await import("pdfjs-dist");
  if (options.pdfWorkerSrc) pdfjs.GlobalWorkerOptions.workerSrc = options.pdfWorkerSrc;
  return pdfjs;
}

/** Mostly single letters with spaces between: text set with wide letter-spacing. */
function isLetterSpaced(text: string): boolean {
  const tokens = text.trim().split(/\s+/);
  return tokens.length >= 4 && tokens.filter((t) => [...t].length <= 2).length / tokens.length >= 0.6;
}

/** Short text in capitals with spaces in it: letter-spaced capitals often arrive broken at odd places ("PROJ EC TS"). */
function isBrokenCapitals(text: string): boolean {
  const clean = text.trim();
  return clean.length <= 60 && /\s/.test(clean) && /\p{Lu}/u.test(clean) && !/\p{Ll}/u.test(clean);
}

/** Every character the page draws, in drawing order, with only the spaces the document itself contains. */
async function drawnText(page: { getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }> }, pdfjs: PdfJs): Promise<string> {
  const list = await page.getOperatorList();
  let text = "";
  for (let i = 0; i < list.fnArray.length; i++) {
    if (list.fnArray[i] !== pdfjs.OPS.showText) continue;
    const glyphs = (list.argsArray[i] as unknown[])[0];
    if (!Array.isArray(glyphs)) continue;
    for (const glyph of glyphs) {
      const unicode = (glyph as { unicode?: unknown } | null)?.unicode;
      if (typeof unicode === "string") text += unicode;
    }
  }
  return text;
}

/** The same letters as `text`, spaced the way the document wrote them. Null when they cannot be found. */
export function respace(text: string, drawn: string): string | null {
  const letters = text.replace(/\s+/g, "");
  if (letters.length < 3) return null;
  let packed = "";
  const at: number[] = [];
  for (let i = 0; i < drawn.length; i++) {
    if (/\s/.test(drawn[i]!)) continue;
    packed += drawn[i];
    at.push(i);
  }
  const found = packed.indexOf(letters);
  if (found < 0) return null;
  const real = drawn.slice(at[found]!, at[found + letters.length - 1]! + 1).replace(/\s+/g, " ").trim();
  if (real.includes(" ")) return real;
  // The document wrote no spaces here. That is the truth for one word broken into pieces ("PROJ EC TS"),
  // but a document that places every word by position writes none anywhere: leave real words alone.
  const tokens = text.trim().split(/\s+/);
  return letters.length / tokens.length <= 3 ? real : null;
}

export interface PdfExtraction {
  /** Pages read (at most MAX_PAGES). */
  pages: number;
  lines: Line[];
  /** The text exactly as stored in the file, before clean-up, for judging whether it is damaged. */
  raw: string;
  warnings: ImportWarning[];
}

/** Read the text layer of a PDF and rebuild its lines in reading order. Nothing is rendered or fetched. */
export async function extractPdfLines(bytes: Uint8Array, options: ImportOptions = {}): Promise<PdfExtraction> {
  const pdfjs = await loadPdfJs(options);
  let doc: Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
  try {
    doc = await pdfjs.getDocument({
      data: bytes.slice(),
      disableAutoFetch: true,
      disableStream: true,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "";
    throw new ImportError(name === "PasswordException" ? "encrypted" : "corrupt");
  }

  const pages: PageItems[] = [];
  try {
    const count = Math.min(doc.numPages, MAX_PAGES);
    for (let n = 1; n <= count; n++) {
      const page = await doc.getPage(n);
      const width = page.getViewport({ scale: 1 }).width;
      const content = await page.getTextContent();
      const items: Item[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str) continue;
        const t = raw.transform as number[];
        const size = Math.hypot(t[2] ?? 0, t[3] ?? 0) || raw.height || 10;
        items.push({ str: raw.str, x: t[4] ?? 0, y: t[5] ?? 0, width: raw.width, size, font: raw.fontName });
      }
      // Letter-spaced text ("S O P H E A  C H A N") arrives with a space after every letter and the real
      // word breaks lost. The page's drawing instructions still have them.
      const spaced = items.filter((item) => isLetterSpaced(item.str) || isBrokenCapitals(item.str));
      if (spaced.length) {
        const drawn = await drawnText(page, pdfjs).catch(() => "");
        for (const item of spaced) item.str = respace(item.str, drawn) ?? item.str;
      }
      pages.push({ width, items });
    }
  } catch {
    throw new ImportError("corrupt");
  } finally {
    void doc.destroy();
  }
  const { lines, raw, uncertain } = linesFromPages(pages);
  return { pages: pages.length, lines, raw, warnings: uncertain ? ["layout-uncertain"] : [] };
}
