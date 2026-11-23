/**
 * Reading order for a page of positioned text.
 *
 * A PDF (or a scanned page after text recognition) gives us pieces of text
 * with coordinates and nothing else. Before any of it can be understood as a
 * CV, the page has to be read the way a person reads it: a header across the
 * top, then one column, then the next. This finds the columns by looking for
 * tall empty bands between the text, cuts the page along them, and returns
 * the lines of each block in order.
 */
import { findDates } from "./dates";
import { knownHeading } from "./headings";
import { collapseSpaced, tidy, type Line } from "./lines";

/** One piece of text and where it sits. Units are points; `y` grows upwards, as in a PDF. */
export interface Item {
  str: string;
  x: number;
  y: number;
  width: number;
  /** Font size. */
  size: number;
  /** Font name, or "" when unknown. */
  font: string;
}

export interface PageItems {
  width: number;
  items: Item[];
  /** Positions were measured from a picture of the page, so they are a point or two out. */
  approximate?: boolean;
}

interface Segment {
  text: string;
  x: number;
  end: number;
  size: number;
  /** Font the segment starts in. */
  font: string;
  /** Font it ends in. */
  lastFont: string;
}

/** The items of one visual row, left to right. */
type Row = Item[];

/** A block of the page: rows read straight down, or two columns read one after the other. */
type Region =
  | { kind: "rows"; rows: Row[] }
  | {
      kind: "columns";
      /** Middle of the empty band between the columns. */
      at: number;
      left: Region[];
      right: Region[];
      /** Which column runs to the foot of its page: the one a following page carries on from. */
      longer: "left" | "right";
      /** Set when the text after this block is a continuation of the longer column. */
      continued?: boolean;
    };

export interface LaidOutText {
  lines: Line[];
  /** The text as found, before clean-up, for judging whether it is damaged. */
  raw: string;
  /** Set when a row held more separate pieces than a line can carry: the order may be wrong. */
  uncertain: boolean;
}

/* ---------- Rows ---------- */

function toRows(items: Item[]): Row[] {
  const sorted = items.filter((item) => item.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const item of sorted) {
    const row = rows[rows.length - 1];
    const ref = row?.[0];
    if (ref && Math.abs(ref.y - item.y) <= Math.max(2, Math.min(ref.size, item.size) * 0.45)) row.push(item);
    else rows.push([item]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

/** Join the items of one row into segments, splitting where there is a wide horizontal gap. */
function toSegments(row: Row): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  // Letter-spaced text arrives one letter per item. The usual gap between letters tells letters from words.
  const letterGaps: number[] = [];
  for (let i = 1; i < row.length; i++) {
    const a = row[i - 1]!;
    const b = row[i]!;
    if ([...a.str.trim()].length === 1 && [...b.str.trim()].length === 1) letterGaps.push(b.x - (a.x + a.width));
  }
  letterGaps.sort((a, b) => a - b);
  const letterGap = letterGaps.length >= 4 ? letterGaps[Math.floor(letterGaps.length / 2)]! : null;
  let previous: Item | null = null;
  for (const item of row) {
    const gap = current ? item.x - current.end : 0;
    const size = Math.max(item.size, current?.size ?? 0) || 10;
    if (current && gap > size * 2.6) {
      segments.push(current);
      current = null;
    }
    if (!current) {
      current = { text: item.str, x: item.x, end: item.x + item.width, size: item.size, font: item.font, lastFont: item.font };
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
    current.lastFont = item.font;
    if (item.str.trim().length > 2 && item.size > current.size) current.size = item.size;
    previous = item;
  }
  if (current) segments.push(current);
  return segments.filter((s) => s.text.trim());
}

/* ---------- Columns ---------- */

/** Width of one slice of the page when looking for empty bands, in points. */
const BIN = 2;
/** The narrowest empty band that can separate two columns, in points. */
const MIN_BAND = 8;
/** Fewest rows each column must have. */
const MIN_ROWS = 5;

interface Gutter {
  /** Rows [from, to) are in two columns. */
  from: number;
  to: number;
  /** The empty band between them, in points. */
  x0: number;
  x1: number;
}

/** A row's items on one side of a band. */
const sideOf = (row: Row, band: { x0: number; x1: number }, side: "left" | "right") => {
  const mid = (band.x0 + band.x1) / 2;
  return row.filter((item) => (side === "left" ? item.x < mid : item.x >= mid));
};
const textOf = (items: Item[]) => items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();

/** A date, or the name of a section: the kind of text that sits in a margin beside the real content. */
function isLabel(text: string): boolean {
  const clean = collapseSpaced(text).trim();
  if (!clean) return false;
  const dates = findDates(clean);
  return Boolean(knownHeading(clean)) || Boolean(dates && dates.rest.length <= 3);
}

/** A few plain words, the way a table names its rows ("Technical", "Soft skills"). */
function isShortLabel(text: string): boolean {
  return text.length <= 24 && text.split(/\s+/).length <= 3 && !/[@,.;]|\d{4,}/.test(text);
}

/** Looks like the title of a section even when the wording is not one we know: capitals, or set larger than the text. */
function isHeadingLike(items: Item[], body: number): boolean {
  const text = collapseSpaced(textOf(items)).trim();
  if (!text || text.length > 40 || text.split(/\s+/).length > 5 || /[@]|\d{3,}/.test(text)) return false;
  if (knownHeading(text)) return true;
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 3) return false;
  const capitals = /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);
  const larger = Math.max(...items.map((item) => item.size)) >= body * 1.15;
  return capitals || larger;
}

/**
 * Whether an empty band really separates two columns of text, each read on its own.
 * Dates set to one side of each entry, section names in a margin, and small tables
 * (a label and its value) also leave an empty band, and must be read row by row.
 */
function separatesColumns(rows: Row[], band: { x0: number; x1: number }, body: number): boolean {
  const leftItems = rows.map((row) => sideOf(row, band, "left"));
  const rightItems = rows.map((row) => sideOf(row, band, "right"));
  const left = leftItems.map(textOf);
  const right = rightItems.map(textOf);
  const leftRows = left.filter(Boolean);
  const rightRows = right.filter(Boolean);
  if (leftRows.length < MIN_ROWS || rightRows.length < MIN_ROWS) return false;
  const share = (texts: string[], test: (text: string) => boolean) => (texts.length ? texts.filter(test).length / texts.length : 0);

  // A margin of dates or section names on either side is one column with labels, not two columns.
  const both = rows.map((_, i) => i).filter((i) => left[i] && right[i]);
  if (both.length >= 3 && share(both.map((i) => left[i]!), isLabel) >= 0.6) return false;
  if (share(rightRows, isLabel) >= 0.6 || share(leftRows, isLabel) >= 0.6) return false;

  // Two columns that each carry their own section titles are read separately.
  const titled = (items: Item[][]) => items.some((row) => row.length > 0 && isHeadingLike(row, body));
  const named = (texts: string[]) => texts.some((text) => knownHeading(collapseSpaced(text).trim()));
  if (titled(leftItems) && titled(rightItems) && (named(leftRows) || named(rightRows))) return true;

  // Otherwise a side made of labels, each sitting beside the text it names, is a table or a margin.
  const beside = (mine: string[], other: string[]) =>
    share(mine.map((text, i) => (text ? (isLabel(text) || (isShortLabel(text) && other[i]) ? "label" : "text") : "")).filter(Boolean), (kind) => kind === "label");
  if (beside(left, right) >= 0.6 || beside(right, left) >= 0.6) return false;

  // What is left is two bodies of text. Lines without a partner on the other side, or sheer height, settle it.
  const leftOnly = left.filter((text, i) => text && !right[i]).length;
  const rightOnly = right.filter((text, i) => text && !left[i]).length;
  return rows.length >= 12 || (leftOnly >= 2 && rightOnly >= 2);
}

/**
 * Where two columns really stop. Rows are counted as part of the columns for as long as nothing crosses the
 * band, but a full-width section that follows usually opens with short lines (its title, a name) that do not
 * cross it either. When the run is ended by full-width text, the rows after the shorter column are handed back
 * from their last section title onwards.
 */
function endOfColumns(rows: Row[], from: number, to: number, band: { x0: number; x1: number }, body: number): number {
  if (to >= rows.length) return to;
  let lastLeft = from - 1;
  let lastRight = from - 1;
  for (let r = from; r < to; r++) {
    if (sideOf(rows[r]!, band, "left").length) lastLeft = r;
    if (sideOf(rows[r]!, band, "right").length) lastRight = r;
  }
  for (let r = to - 1; r > Math.min(lastLeft, lastRight); r--) if (isHeadingLike(rows[r]!, body)) return r;
  return to;
}

/** The tallest run of rows with an empty band through it and text on both sides, if there is one. */
function findGutter(rows: Row[], width: number, body: number): Gutter | null {
  if (rows.length < MIN_ROWS) return null;
  const bins = Math.max(1, Math.ceil(width / BIN));
  const half = Math.ceil(MIN_BAND / BIN / 2);
  // For every row, how many text-covered slices lie to the left of each slice (a running total).
  const covered = rows.map((row) => {
    const mark = new Uint8Array(bins);
    for (const item of row) {
      const from = Math.max(0, Math.floor(item.x / BIN));
      const to = Math.min(bins, Math.ceil((item.x + item.width) / BIN));
      for (let b = from; b < to; b++) mark[b] = 1;
    }
    const total = new Uint16Array(bins + 1);
    for (let b = 0; b < bins; b++) total[b + 1] = total[b]! + mark[b]!;
    return total;
  });
  const clear = (r: number, b: number) => covered[r]![Math.min(bins, b + half)]! - covered[r]![Math.max(0, b - half)]! === 0;
  const hasLeft = (r: number, b: number) => covered[r]![Math.max(0, b - half)]! > 0;
  const hasRight = (r: number, b: number) => covered[r]![bins]! - covered[r]![Math.min(bins, b + half)]! > 0;

  interface Candidate {
    from: number;
    to: number;
    at: number;
    score: number;
  }
  const candidates: Candidate[] = [];
  for (let b = half; b < bins - half; b++) {
    let from = -1;
    for (let r = 0; r <= rows.length; r++) {
      const open = r < rows.length && clear(r, b);
      if (open && from < 0) from = r;
      if (!open && from >= 0) {
        let lefts = 0;
        let rights = 0;
        for (let k = from; k < r; k++) {
          if (hasLeft(k, b)) lefts++;
          if (hasRight(k, b)) rights++;
        }
        if (lefts >= MIN_ROWS && rights >= MIN_ROWS) candidates.push({ from, to: r, at: b, score: Math.min(lefts, rights) * 1000 + (r - from) });
        from = -1;
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const tried = new Set<string>();
  for (const candidate of candidates) {
    // Widen the band to every slice that is empty in all rows of the run.
    const empty = (b: number) => {
      for (let r = candidate.from; r < candidate.to; r++) if (covered[r]![b + 1]! - covered[r]![b]! > 0) return false;
      return true;
    };
    let lo = candidate.at;
    let hi = candidate.at;
    while (lo > 0 && empty(lo - 1)) lo--;
    while (hi < bins - 1 && empty(hi + 1)) hi++;
    const key = `${candidate.from}:${candidate.to}:${lo}`;
    if (tried.has(key)) continue;
    tried.add(key);
    const band = { x0: lo * BIN, x1: (hi + 1) * BIN };
    const to = endOfColumns(rows, candidate.from, candidate.to, band, body);
    if (separatesColumns(rows.slice(candidate.from, to), band, body)) return { from: candidate.from, to, ...band };
    if (tried.size > 40) break;
  }
  return null;
}

/** Cut a run of rows into blocks: full-width rows, and pairs of columns (which may themselves hold columns). */
function toRegions(rows: Row[], width: number, body: number, depth = 0): Region[] {
  if (rows.length === 0) return [];
  const gutter = depth < 3 ? findGutter(rows, width, body) : null;
  if (!gutter) return [{ kind: "rows", rows }];
  const mid = (gutter.x0 + gutter.x1) / 2;
  const run = rows.slice(gutter.from, gutter.to);
  const side = (keep: (item: Item) => boolean) => run.map((row) => row.filter(keep)).filter((row) => row.length > 0);
  const leftRows = side((item) => item.x < mid);
  const rightRows = side((item) => item.x >= mid);
  // Rows run down the page, so the column whose last row is lowest has the smaller y.
  const foot = (column: Row[]) => column[column.length - 1]?.[0]?.y ?? Infinity;
  return [
    ...toRegions(rows.slice(0, gutter.from), width, body, depth + 1),
    {
      kind: "columns",
      at: mid,
      left: toRegions(leftRows, width, body, depth + 1),
      right: toRegions(rightRows, width, body, depth + 1),
      longer: foot(rightRows) < foot(leftRows) ? "right" : "left",
    },
    ...toRegions(rows.slice(gutter.to), width, body, depth + 1),
  ];
}

/* ---------- Lines ---------- */

/** The font size most of the text is set in. */
function bodySize(items: Item[]): number {
  const use = new Map<number, number>();
  for (const item of items) {
    const size = Math.round(item.size * 2) / 2;
    use.set(size, (use.get(size) ?? 0) + item.str.trim().length);
  }
  return [...use.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
}

/**
 * The lines of a document in reading order, from the positioned text of its pages.
 * Columns that carry on from one page to the next are read as one column, so a
 * sidebar never interrupts the main text.
 */
export function linesFromPages(pages: PageItems[]): LaidOutText {
  const regions: Region[] = [];
  for (const page of pages) {
    const next = toRegions(toRows(page.items), page.width, bodySize(page.items));
    const last = regions[regions.length - 1];
    const first = next[0];
    if (last?.kind === "columns" && first?.kind === "columns" && Math.abs(last.at - first.at) <= page.width * 0.08) {
      // The same two columns carry on over the page.
      last.left.push(...first.left);
      last.right.push(...first.right);
      last.longer = first.longer;
      next.shift();
    } else if (last?.kind === "columns" && first?.kind === "rows") {
      // No columns of its own at the top of this page. Text that keeps clear of the earlier band still belongs
      // to those columns (a sidebar that ended on the page before); text that runs across it starts afresh.
      const at = last.at;
      const crosses = (row: Row) => row.some((item) => item.x < at - 2 && item.x + item.width > at + 2);
      let kept = 0;
      while (kept < first.rows.length && !crosses(first.rows[kept]!)) kept++;
      if (kept > 0) {
        const carried = first.rows.slice(0, kept);
        const side = (keep: (item: Item) => boolean) => carried.map((row) => row.filter(keep)).filter((row) => row.length > 0);
        const left = side((item) => item.x < at);
        const right = side((item) => item.x >= at);
        if (left.length) last.left.push({ kind: "rows", rows: left });
        if (right.length) last.right.push({ kind: "rows", rows: right });
        if (kept === first.rows.length) next.shift();
        else first.rows = first.rows.slice(kept);
      }
      if (next[0] === first) last.continued = true;
    }
    regions.push(...next);
  }

  const loose = pages.some((page) => page.approximate);
  const fontUse = new Map<string, number>();
  for (const page of pages) for (const item of page.items) fontUse.set(item.font, (fontUse.get(item.font) ?? 0) + item.str.trim().length);
  const bodyFont = fontUse.size > 1 ? [...fontUse.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;

  const lines: Line[] = [];
  const raw: string[] = [];
  let uncertain = false;
  const emit = (list: Region[]) => {
    for (const region of list) {
      if (region.kind === "columns") {
        // Left before right, unless what follows carries on from the left column: then that one is read last.
        const leftLast = region.continued && region.longer === "left";
        emit(leftLast ? region.right : region.left);
        emit(leftLast ? region.left : region.right);
        continue;
      }
      const rows = region.rows.map(toSegments).filter((segments) => segments.length > 0);
      const edge = Math.max(0, ...rows.map((segments) => segments[segments.length - 1]!.end));
      const start = Math.min(...rows.map((segments) => segments[0]!.x));
      for (let r = 0; r < rows.length; r++) {
        const [first, ...rest] = rows[r]!;
        if (!first) continue;
        if (rest.length > 1) uncertain = true;
        const sideRaw = rest.map((segment) => segment.text).join("  ");
        raw.push(first.text + (sideRaw ? ` ${sideRaw}` : ""));
        const text = tidy(collapseSpaced(first.text));
        const right = tidy(collapseSpaced(sideRaw));
        if (!text && !right) continue;
        const end = rest.length ? rest[rest.length - 1]!.end : first.end;
        // A line was wrapped if the first word of the next line would not have fitted after it.
        let room = first.size * 2.2;
        const below = rows[r + 1]?.[0];
        if (below) {
          const text = collapseSpaced(below.text).trim();
          const word = text.split(/\s+/)[0] ?? "";
          const letters = Math.max(1, [...text].length);
          // Text without spaces (Khmer) has no first word to measure: keep the plain allowance.
          if ([...word].length <= 24) room = Math.min(((below.end - below.x) * [...word].length) / letters + first.size * 0.3, (edge - start) * 0.4);
        }
        if (loose) room += first.size * 0.6;
        lines.push({
          text: text || right,
          ...(text && right ? { right } : {}),
          size: Math.round(first.size * 10) / 10,
          x: Math.round(first.x * 10) / 10,
          // Beside a part set to the right (a date), the text has only the space up to that part.
          ...((rest.length ? first.end >= rest[0]!.x - first.size * 3.2 : end >= edge - room) ? { wraps: true } : {}),
          ...(loose ? { loose: true } : {}),
          ...(bodyFont !== undefined && first.font !== bodyFont ? { emph: true } : {}),
          ...(bodyFont !== undefined && first.lastFont !== first.font ? { tail: first.lastFont !== bodyFont } : {}),
        });
      }
    }
  };
  emit(regions);
  return { lines, raw: raw.join("\n"), uncertain };
}
