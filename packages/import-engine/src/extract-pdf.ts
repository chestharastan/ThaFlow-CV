import { ImportError, type ImportOptions, type ImportWarning } from "./types";
import { findDates } from "./dates";
import { knownHeading } from "./headings";
import { collapseSpaced, tidy, type Line } from "./lines";

const MAX_PAGES = 20;

interface Item {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
  font: string;
}

interface Segment {
  text: string;
  x: number;
  end: number;
  y: number;
  size: number;
  font: string;
}

type PdfJs = typeof import("pdfjs-dist");

async function loadPdfJs(options: ImportOptions): Promise<PdfJs> {
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

/** Join the items of one visual row into segments, splitting where there is a wide horizontal gap. */
function toSegments(row: Item[]): Segment[] {
  row.sort((a, b) => a.x - b.x);
  const segments: Segment[] = [];
  let current: Segment | null = null;
  // Letter-spaced text arrives one letter per item. The usual gap between letters tells letters from words.
  const letters = row.filter((item) => item.str.trim());
  const letterGaps: number[] = [];
  for (let i = 1; i < letters.length; i++) {
    const a = letters[i - 1]!;
    const b = letters[i]!;
    if ([...a.str.trim()].length === 1 && [...b.str.trim()].length === 1) letterGaps.push(b.x - (a.x + a.width));
  }
  letterGaps.sort((a, b) => a - b);
  const letterGap = letterGaps.length >= 4 ? letterGaps[Math.floor(letterGaps.length / 2)]! : null;
  let previous: Item | null = null;
  for (const item of row) {
    // Whitespace-only items would hide the real gap between two pieces of text.
    if (!item.str.trim()) continue;
    const gap = current ? item.x - current.end : 0;
    const size = Math.max(item.size, current?.size ?? 0) || 10;
    if (current && gap > size * 2.6) {
      segments.push(current);
      current = null;
    }
    if (!current) {
      current = { text: item.str, x: item.x, end: item.x + item.width, y: item.y, size: item.size, font: item.font };
      previous = item;
      continue;
    }
    // A gap wider than a word space is a visual separation (pills, table cells): keep it as a double space.
    const spaced = letterGap !== null && previous !== null && [...previous.str.trim()].length === 1 && [...item.str.trim()].length <= 2;
    const joiner = spaced
      ? gap > letterGap * 1.6 + size * 0.12 ? "  " : " "
      : gap > size * 0.85 ? "  " : gap > size * 0.14 && !/\s$/.test(current.text) && !/^\s/.test(item.str) ? " " : "";
    current.text += joiner + item.str;
    current.end = Math.max(current.end, item.x + item.width);
    if (item.str.trim().length > 2 && item.size > current.size) current.size = item.size;
    previous = item;
  }
  if (current) segments.push(current);
  return segments.filter((s) => s.text.trim());
}

/** Find the x where a second column starts, if the page is laid out in two columns. */
function findColumnSplit(rows: Segment[][], pageWidth: number): number | null {
  const starts = new Map<number, number>();
  for (const row of rows) {
    for (const seg of row) {
      if (seg.x < pageWidth * 0.28 || seg.x > pageWidth * 0.8) continue;
      const key = Math.round(seg.x / 3) * 3;
      starts.set(key, (starts.get(key) ?? 0) + 1);
    }
  }
  const best = [...starts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 6) return null;
  const split = best[0] - 5;
  // A real second column has text on both sides: rows where a left segment ends before the split.
  const leftRows = rows.filter((row) => row.some((seg) => seg.end < split)).length;
  const rightRows = rows.filter((row) => row.some((seg) => Math.abs(seg.x - best[0]) <= 3)).length;
  const crossing = rows.filter((row) => row.some((seg) => seg.x < split - 20 && seg.end > split + 20)).length;
  if (leftRows < 5 || rightRows < 6 || crossing > Math.max(3, rows.length * 0.25)) return null;
  // A gutter of dates or section labels beside the text (on either side) is one column, not two.
  const isLabel = (text: string) => {
    const clean = collapseSpaced(text).trim();
    const dates = findDates(clean);
    return Boolean(knownHeading(clean)) || Boolean(dates && dates.rest.length <= 3);
  };
  const both = rows.filter((row) => row.some((seg) => seg.end < split) && row.some((seg) => seg.x >= split));
  const leftLabels = both.filter((row) => isLabel(row.find((seg) => seg.end < split)!.text)).length;
  const rightSide = rows.flatMap((row) => row.filter((seg) => seg.x >= split));
  const rightLabels = rightSide.filter((seg) => isLabel(seg.text)).length;
  if (both.length >= 3 && leftLabels / both.length >= 0.6) return null;
  if (rightSide.length >= 3 && rightLabels / rightSide.length >= 0.6) return null;
  return split;
}

export interface PdfExtraction {
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

  const lines: Line[] = [];
  const fontUse = new Map<string, number>();
  type Placed = { seg: Segment; right?: Segment; edge: number };
  // Column 0 of every page, then column 1 of every page: a sidebar never interrupts the main text.
  const columns: Placed[][] = [[], []];
  let uncertain = false;
  let docSplit: number | null = null;
  try {
    const pages = Math.min(doc.numPages, MAX_PAGES);
    for (let n = 1; n <= pages; n++) {
      const page = await doc.getPage(n);
      const width = page.getViewport({ scale: 1 }).width;
      const content = await page.getTextContent();
      const items: Item[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str) continue;
        const t = raw.transform as number[];
        const size = Math.hypot(t[2] ?? 0, t[3] ?? 0) || raw.height || 10;
        items.push({ str: raw.str, x: t[4] ?? 0, y: t[5] ?? 0, width: raw.width, size, font: raw.fontName });
        fontUse.set(raw.fontName, (fontUse.get(raw.fontName) ?? 0) + raw.str.trim().length);
      }
      // Group into visual rows by baseline.
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const rows: Item[][] = [];
      for (const item of items) {
        const row = rows[rows.length - 1];
        const ref = row?.[0];
        if (ref && Math.abs(ref.y - item.y) <= Math.max(2, Math.min(ref.size, item.size) * 0.45)) row.push(item);
        else rows.push([item]);
      }
      const segmented = rows.map(toSegments).filter((r) => r.length > 0);
      const split: number | null = findColumnSplit(segmented, width) ?? docSplit;
      docSplit ??= split;
      const placed: Placed[][] = [[], []];
      for (const row of segmented) {
        for (const side of [0, 1] as const) {
          const mine = split === null ? (side === 0 ? row : []) : row.filter((seg) => (seg.x < split ? 0 : 1) === side);
          const [first, ...rest] = mine;
          if (!first) continue;
          if (rest.length > 1) uncertain = true;
          const right = rest.length ? { ...rest[0]!, text: rest.map((r) => r.text).join("  "), end: rest[rest.length - 1]!.end } : undefined;
          placed[side]!.push({ seg: first, ...(right ? { right } : {}), edge: 0 });
        }
      }
      for (const side of [0, 1] as const) {
        const edge = Math.max(0, ...placed[side]!.map((p) => p.right?.end ?? p.seg.end));
        for (const p of placed[side]!) columns[side]!.push({ ...p, edge });
      }
    }
  } catch {
    throw new ImportError("corrupt");
  } finally {
    void doc.destroy();
  }

  const bodyFont = [...fontUse.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const raw = [...columns[0]!, ...columns[1]!].map((p) => p.seg.text + (p.right ? ` ${p.right.text}` : "")).join("\n");
  for (const { seg, right, edge } of [...columns[0]!, ...columns[1]!]) {
    const text = tidy(collapseSpaced(seg.text));
    const side = right ? tidy(collapseSpaced(right.text)) : "";
    if (!text && !side) continue;
    const end = right?.end ?? seg.end;
    lines.push({
      text: text || side,
      ...(text && side ? { right: side } : {}),
      size: Math.round(seg.size * 10) / 10,
      x: Math.round(seg.x * 10) / 10,
      ...(end >= edge - seg.size * 2.2 ? { wraps: true } : {}),
      ...(bodyFont && seg.font !== bodyFont ? { emph: true } : {}),
    });
  }
  return { lines, raw, warnings: uncertain ? ["layout-uncertain"] : [] };
}
