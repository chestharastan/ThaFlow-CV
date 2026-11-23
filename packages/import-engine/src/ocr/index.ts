/**
 * Reading a CV that is a picture: a photo, a screenshot, or a PDF made by a
 * scanner (or one whose text layer is unusable, as Khmer PDFs often are).
 *
 * Each page becomes an image, the reader finds and reads its lines, and the
 * lines are handed on as positioned text, exactly as if they had come out of
 * a PDF's text layer. Everything runs in the browser.
 */
import type { PageItems } from "../layout";
import { OcrEngine, type OcrLine, type OrtModule } from "./engine";
import { boundsOf, distance } from "./geometry";
import { OCR_MODEL_BASE, loadModels } from "./models";

export { OCR_DOWNLOAD_BYTES, OCR_MODEL_BASE, OCR_MODEL_FILES, modelsAreCached } from "./models";
export type { OrtModule } from "./engine";

export type OcrProgress =
  /** Fetching the reading models (first use only). */
  | { stage: "download"; loaded: number; total: number }
  /** Starting the reader. */
  | { stage: "prepare" }
  /** Reading: lines done on the current page. */
  | { stage: "read"; page: number; pages: number; done: number; total: number };

export interface OcrOptions {
  /** Loads ONNX Runtime Web. The app serves it from its own origin. */
  runtime(): Promise<OrtModule>;
  /** Where the models are downloaded from. Defaults to ThaOCR's published models. */
  modelBase?: string;
  onProgress?(progress: OcrProgress): void;
}

/** Why a picture could not be read. */
export class OcrError extends Error {
  constructor(public readonly reason: "undecodable" | "unavailable") {
    super(`OCR failed: ${reason}`);
    this.name = "OcrError";
  }
}

/** Pages wider or taller than this are scaled down first: more pixels cost memory and add nothing. */
const MAX_SIDE = 3200;
/** PDF pages are drawn with their long side this many pixels. */
const PDF_SIDE = 2200;
/** A CV runs to a few pages. More than this is not read (it would take minutes on a phone). */
export const MAX_OCR_PAGES = 6;

let engine: Promise<OcrEngine> | null = null;
let engineBase = "";

function startEngine(options: OcrOptions): Promise<OcrEngine> {
  const base = options.modelBase ?? OCR_MODEL_BASE;
  if (!engine || engineBase !== base) {
    engineBase = base;
    engine = (async () => {
      const models = await loadModels(base, (loaded, total) => options.onProgress?.({ stage: "download", loaded, total }));
      options.onProgress?.({ stage: "prepare" });
      return OcrEngine.create(await options.runtime(), models);
    })();
    // A failed start (offline, blocked) must not be remembered: the next attempt starts again.
    engine.catch(() => (engine = null));
  }
  return engine;
}

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** Decode an image file into a canvas, turned the right way up. Throws OcrError when the browser cannot open it. */
async function decodeImage(file: Blob): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Formats createImageBitmap refuses (SVG, some others) may still load as an <img>.
    const url = URL.createObjectURL(file);
    try {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image"));
        img.src = url;
      });
    } catch {
      throw new OcrError("undecodable");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new OcrError("undecodable");
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = canvasOf(width * scale, height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new OcrError("unavailable");
  // Transparent pictures (PNG screenshots) are read as if on white paper.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  return canvas;
}

/** Strokes this many times thicker than the page's usual are bold. */
const BOLD = 1.22;

/** A page 595 points wide, like A4, so the same layout rules apply to pictures of any size. */
const PAGE_WIDTH = 595;

/** Marks with no words in them: a bullet or a speck that the detector boxed on its own. */
const isNoise = (text: string) => !/[\p{L}\p{N}]/u.test(text) || ([...text].length <= 2 && !/^[\p{L}\p{N}#+]+$/u.test(text));

/** How far the page is turned, in radians: the usual slope of its longer lines. A photo is rarely square-on. */
function skewOf(lines: OcrLine[]): number {
  const slopes = lines
    .filter((line) => distance(line.quad[0], line.quad[1]) > 4 * distance(line.quad[0], line.quad[3]))
    .map((line) => Math.atan2(line.quad[1][1] - line.quad[0][1], line.quad[1][0] - line.quad[0][0]))
    .sort((a, b) => a - b);
  if (slopes.length < 5) return 0;
  const usual = slopes[Math.floor(slopes.length / 2)]!;
  // Below a third of a degree the page is straight; beyond 20 it is something we do not understand.
  return Math.abs(usual) < 0.006 || Math.abs(usual) > 0.35 ? 0 : usual;
}

/** Lines found on a page, as positioned text in points. */
export function itemsFromLines(found: OcrLine[], width: number, height: number): PageItems {
  const lines = found.filter((line) => !isNoise(line.text));
  const scale = PAGE_WIDTH / width;
  // Straighten the page first: on a tilted photo the two ends of a row are at different heights, and
  // the gap between two columns is no longer upright.
  const skew = skewOf(lines);
  const cos = Math.cos(-skew);
  const sin = Math.sin(-skew);
  const upright = ([x, y]: readonly [number, number]): [number, number] => [width / 2 + (x - width / 2) * cos - (y - height / 2) * sin, height / 2 + (x - width / 2) * sin + (y - height / 2) * cos];
  // The height of each line itself, not of its upright bounds, which grow when the page is tilted.
  const heights = lines.map((line) => (distance(line.quad[0], line.quad[3]) + distance(line.quad[1], line.quad[2])) / 2);
  // A box hugs its own letters, so lines of one size measure a little differently ("ran" against "Typing").
  // Everything near the usual height is taken to be body text; only clearly larger type keeps its own size.
  const sorted = heights.slice().sort((a, b) => a - b);
  const usual = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  // Bold type: strokes clearly thicker than the page's usual. Told apart here as a different "font".
  const strokes = lines.map((line) => line.stroke).filter((stroke) => stroke > 0).sort((a, b) => a - b);
  const pen = strokes.length >= 6 ? strokes[Math.floor(strokes.length / 2)]! : 0;
  return {
    width: PAGE_WIDTH,
    approximate: true,
    items: lines.map((line, i) => {
      const lineHeight = Math.abs(heights[i]! - usual) <= usual * 0.24 ? usual : heights[i]!;
      const [left, top, right, bottom] = boundsOf(line.quad.map(upright));
      return {
        // A bullet read as a stray mark stuck to the first word (".Built") is a bullet.
        str: line.text.replace(/^[.·*•▪]\s*(?=\p{Lu})/u, "• "),
        x: left * scale,
        // Lines on one row share a middle more reliably than a baseline: boxes hug their own letters.
        y: (height - (top + bottom) / 2) * scale,
        width: (right - left) * scale,
        // A detected box hugs the letters; the type size is a little more than its height.
        size: lineHeight * scale * 1.2,
        font: pen && line.stroke >= pen * BOLD ? "bold" : "",
      };
    }),
  };
}

async function readPages(pages: AsyncIterable<HTMLCanvasElement> | Iterable<HTMLCanvasElement>, count: number, options: OcrOptions): Promise<PageItems[]> {
  let reader: OcrEngine;
  try {
    reader = await startEngine(options);
  } catch {
    throw new OcrError("unavailable");
  }
  const out: PageItems[] = [];
  let n = 0;
  for await (const canvas of pages) {
    n++;
    const page = n;
    let lines: OcrLine[];
    try {
      lines = await reader.read(canvas, (done, total) => options.onProgress?.({ stage: "read", page, pages: count, done, total }));
    } catch {
      throw new OcrError("unavailable");
    }
    out.push(itemsFromLines(lines, canvas.width, canvas.height));
    // Free the page's pixels before the next one is drawn.
    canvas.width = canvas.height = 0;
  }
  return out;
}

/** Read the text of a picture of a CV. */
export async function readImage(file: Blob, options: OcrOptions): Promise<PageItems[]> {
  const canvas = await decodeImage(file);
  return readPages([canvas], 1, options);
}

type PdfJs = typeof import("pdfjs-dist");

/** Read the text of a PDF by looking at its pages, for when its text layer is missing or unusable. */
export async function readPdfPages(bytes: Uint8Array, pdfjs: PdfJs, options: OcrOptions, wasmUrl?: string): Promise<PageItems[]> {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), disableAutoFetch: true, disableStream: true, verbosity: 0, ...(wasmUrl ? { wasmUrl } : {}) }).promise;
  try {
    const count = Math.min(doc.numPages, MAX_OCR_PAGES);
    async function* draw() {
      for (let n = 1; n <= count; n++) {
        const page = await doc.getPage(n);
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PDF_SIDE / Math.max(natural.width, natural.height) });
        const canvas = canvasOf(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new OcrError("unavailable");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        page.cleanup();
        yield canvas;
      }
    }
    return await readPages(draw(), count, options);
  } finally {
    void doc.destroy();
  }
}
