/**
 * Reading text from a picture of a page, on the device.
 *
 * Two small neural networks do the work, the same ones ThaOCR uses: a detector
 * that finds every line of text on the page, and a recogniser that reads each
 * line (Khmer and Latin). They run in WebAssembly through ONNX Runtime; the
 * image never leaves the browser. This file is the plumbing between a canvas
 * and those models. It needs a browser (canvas), so nothing here runs in Node.
 */
import { decodeLine } from "./ctc";
import { DETECTION_DEFAULTS, boxesFromProbability, detectionSize, distance, type Point, type Quad } from "./geometry";

/* The small part of ONNX Runtime Web this code uses, so the package does not depend on its types. */
export interface OrtTensor {
  data: ArrayLike<number>;
  dims: readonly number[];
}
export interface OrtSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
}
export interface OrtModule {
  InferenceSession: { create(model: Uint8Array, options?: Record<string, unknown>): Promise<OrtSession> };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
}

export interface OcrModels {
  detector: Uint8Array;
  recogniser: Uint8Array;
  /** Characters by index; index 0 is the recogniser's blank. */
  alphabet: string[];
}

/** One line of text found on the page. */
export interface OcrLine {
  /** Corners in the page's pixels: top-left, top-right, bottom-right, bottom-left. */
  quad: Quad;
  text: string;
  /** 0 to 1. */
  confidence: number;
  /** Thickness of the letters' strokes, comparable between lines of one page. Zero when it could not be measured. */
  stroke: number;
}

type Canvas = HTMLCanvasElement;

/* Detector input: the page is resized so its long side falls in this range. */
const LONG_MIN = 1600;
const LONG_MAX = 2200;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/* Recogniser input: every line is straightened to this height. */
const LINE_HEIGHT = 48;
const PAD_X = 0.25;
const PAD_Y = 0.08;
const MIN_WIDTH = 16;
const MAX_WIDTH = 4200;
const MAX_BATCH = 16;
/** Lines read with less certainty than this are noise more often than text (rules, logos, photos). */
const MIN_CONFIDENCE = 0.4;

function newCanvas(width: number, height: number): Canvas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: Canvas): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d canvas");
  return ctx;
}

interface Crop {
  gray: Uint8Array;
  width: number;
  /** How thick the strokes of the letters are, in pixels of the straightened line. */
  stroke: number;
}

/**
 * Thickness of the pen: the usual length of a horizontal run of ink. Every line is straightened to the
 * same height, so the figure can be compared between lines, and bold type stands out by it.
 */
function strokeOf(gray: Uint8Array, width: number): number {
  let low = 255;
  let high = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i]! < low) low = gray[i]!;
    if (gray[i]! > high) high = gray[i]!;
  }
  if (high - low < 40) return 0; // nothing but background
  const ink = (low + high) / 2;
  const counts = new Uint32Array(LINE_HEIGHT + 1);
  let runs = 0;
  for (let y = 0; y < LINE_HEIGHT; y++) {
    let run = 0;
    for (let x = 0; x <= width; x++) {
      if (x < width && gray[y * width + x]! < ink) run++;
      else if (run) {
        // Longer runs are the bars of letters like "T" or a rule under the line, not the pen.
        if (run <= LINE_HEIGHT) {
          counts[run]!++;
          runs++;
        }
        run = 0;
      }
    }
  }
  if (runs < 8) return 0;
  let seen = 0;
  let median = 0;
  for (let length = 1; length <= LINE_HEIGHT && !median; length++) {
    seen += counts[length]!;
    if (seen * 2 >= runs) median = length;
  }
  // The median is a whole number of pixels, too coarse to tell 3 from 4. Average the runs around it instead.
  let total = 0;
  let count = 0;
  for (let length = 1; length <= Math.min(LINE_HEIGHT, median * 2); length++) {
    total += counts[length]! * length;
    count += counts[length]!;
  }
  return count ? total / count : 0;
}

/** Cut one line out of the page and straighten it to the recogniser's height, in grey. */
function cropLine(page: Canvas, quad: Quad): Crop {
  const W = page.width;
  const H = page.height;
  let q: Point[] = quad.map((p) => [p[0], p[1]]);
  // The line's own axes: along the text and down it.
  const down: Point = [(q[3]![0] - q[0]![0] + q[2]![0] - q[1]![0]) / 2, (q[3]![1] - q[0]![1] + q[2]![1] - q[1]![1]) / 2];
  const lineHeight = Math.hypot(down[0], down[1]);
  if (lineHeight > 0) {
    const along: Point = [(q[1]![0] - q[0]![0] + q[2]![0] - q[3]![0]) / 2, (q[1]![1] - q[0]![1] + q[2]![1] - q[3]![1]) / 2];
    const length = Math.max(1e-6, Math.hypot(along[0], along[1]));
    const ux: Point = [along[0] / length, along[1] / length];
    const uy: Point = [down[0] / lineHeight, down[1] / lineHeight];
    const px = PAD_X * lineHeight;
    const py = PAD_Y * lineHeight;
    // A little margin all round: the recogniser was trained on lines with some air.
    q = [
      [q[0]![0] - ux[0] * px - uy[0] * py, q[0]![1] - ux[1] * px - uy[1] * py],
      [q[1]![0] + ux[0] * px - uy[0] * py, q[1]![1] + ux[1] * px - uy[1] * py],
      [q[2]![0] + ux[0] * px + uy[0] * py, q[2]![1] + ux[1] * px + uy[1] * py],
      [q[3]![0] - ux[0] * px + uy[0] * py, q[3]![1] - ux[1] * px + uy[1] * py],
    ];
  }
  q = q.map((p): Point => [Math.min(W - 1, Math.max(0, p[0])), Math.min(H - 1, Math.max(0, p[1]))]);
  const w = Math.min(Math.max(4, Math.round(Math.max(distance(q[1]!, q[0]!), distance(q[2]!, q[3]!)))), Math.max(W, 4));
  const h = Math.min(Math.max(4, Math.round(Math.max(distance(q[3]!, q[0]!), distance(q[2]!, q[1]!)))), Math.max(H, 4));
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round((w * LINE_HEIGHT) / h)));

  const out = newCanvas(width, LINE_HEIGHT);
  const ctx = context(out);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, LINE_HEIGHT);
  // The affine map that sends the line's top-left, top-right and bottom-left corners to the crop's corners.
  const tl = q[0]!;
  const dx: Point = [q[1]![0] - tl[0], q[1]![1] - tl[1]];
  const dy: Point = [q[3]![0] - tl[0], q[3]![1] - tl[1]];
  const det = dx[0] * dy[1] - dx[1] * dy[0];
  if (Math.abs(det) > 1e-6) {
    const a = (width * dy[1]) / det;
    const b = (-LINE_HEIGHT * dx[1]) / det;
    const c = (-width * dy[0]) / det;
    const d = (LINE_HEIGHT * dx[0]) / det;
    ctx.setTransform(a, b, c, d, -(a * tl[0] + c * tl[1]), -(b * tl[0] + d * tl[1]));
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(page, 0, 0);
  }
  const rgba = ctx.getImageData(0, 0, width, LINE_HEIGHT).data;
  const gray = new Uint8Array(width * LINE_HEIGHT);
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i] = (rgba[i * 4]! * 299 + rgba[i * 4 + 1]! * 587 + rgba[i * 4 + 2]! * 114 + 500) / 1000;
  // Light text on a dark sidebar or banner: the recogniser knows dark text on paper, so turn it over.
  if (sum / gray.length < 110) for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i]!;
  return { gray, width, stroke: strokeOf(gray, width) };
}

export class OcrEngine {
  /** One model call at a time: ONNX Runtime's worker answers in order, so overlapping calls could swap results. */
  private queue: Promise<unknown> = Promise.resolve();
  /** How many pixels of line width one step of the recogniser's output covers. */
  private stride = 0;

  private constructor(
    private readonly ort: OrtModule,
    private readonly detector: OrtSession,
    private readonly recogniser: OrtSession,
    private readonly alphabet: string[],
  ) {}

  static async create(ort: OrtModule, models: OcrModels): Promise<OcrEngine> {
    const options = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
    // The runtime takes ownership of the bytes it is given, so each session gets its own copy.
    const detector = await ort.InferenceSession.create(models.detector.slice(), options);
    const recogniser = await ort.InferenceSession.create(models.recogniser.slice(), options);
    return new OcrEngine(ort, detector, recogniser, models.alphabet);
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private run(session: OrtSession, data: Float32Array, dims: number[]): Promise<OrtTensor> {
    return this.serial(async () => {
      const out = await session.run({ [session.inputNames[0]!]: new this.ort.Tensor("float32", data, dims) });
      return out[session.outputNames[0]!]!;
    });
  }

  /** Where the lines of text are. */
  private async detect(page: Canvas): Promise<Quad[]> {
    const [width, height] = detectionSize(page.width, page.height, LONG_MIN, LONG_MAX);
    const small = newCanvas(width, height);
    const ctx = context(small);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(page, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const n = width * height;
    const input = new Float32Array(3 * n);
    // Blue, green, red: the order the detector was trained with.
    for (let i = 0; i < n; i++) {
      input[i] = (rgba[i * 4 + 2]! / 255 - MEAN[0]!) / STD[0]!;
      input[n + i] = (rgba[i * 4 + 1]! / 255 - MEAN[1]!) / STD[1]!;
      input[2 * n + i] = (rgba[i * 4]! / 255 - MEAN[2]!) / STD[2]!;
    }
    const out = await this.run(this.detector, input, [1, 3, height, width]);
    return boxesFromProbability(out.data, out.dims[3]!, out.dims[2]!, page.width, page.height, DETECTION_DEFAULTS).map((box) => box.quad);
  }

  private async strideOf(): Promise<number> {
    if (!this.stride) {
      const probe = await this.run(this.recogniser, new Float32Array(LINE_HEIGHT * 256), [1, 1, LINE_HEIGHT, 256]);
      this.stride = Math.max(1, Math.round(256 / probe.dims[0]!));
    }
    return this.stride;
  }

  /** Read a batch of line crops of similar width. */
  private async readBatch(crops: Crop[]): Promise<{ text: string; confidence: number }[]> {
    const stride = await this.strideOf();
    const width = Math.ceil(Math.max(...crops.map((c) => c.width)) / stride) * stride;
    const input = new Float32Array(crops.length * LINE_HEIGHT * width);
    crops.forEach((crop, i) => {
      const base = i * LINE_HEIGHT * width;
      // Narrower crops are padded on the right by repeating their last column.
      for (let y = 0; y < LINE_HEIGHT; y++) for (let x = 0; x < width; x++) input[base + y * width + x] = (crop.gray[y * crop.width + Math.min(x, crop.width - 1)]! / 255 - 0.5) / 0.5;
    });
    const out = await this.run(this.recogniser, input, [crops.length, 1, LINE_HEIGHT, width]);
    return crops.map((crop, i) => decodeLine(out.data, out.dims, i, Math.floor(crop.width / stride), this.alphabet));
  }

  /** Find and read every line of text on a page. Lines come back in no particular order. */
  async read(page: Canvas, onProgress?: (done: number, total: number) => void): Promise<OcrLine[]> {
    const quads = await this.detect(page);
    const crops = quads.map((quad) => cropLine(page, quad));
    const results = new Array<{ text: string; confidence: number }>(crops.length);
    // Batches of similar width waste the least padding.
    const order = crops.map((_, i) => i).sort((a, b) => crops[a]!.width - crops[b]!.width);
    let done = 0;
    onProgress?.(0, crops.length);
    for (let i = 0; i < order.length; ) {
      let j = i + 1;
      const first = crops[order[i]!]!.width;
      while (j < order.length && j - i < MAX_BATCH && crops[order[j]!]!.width <= 1.35 * first + 16) j++;
      const batch = order.slice(i, j);
      const read = await this.readBatch(batch.map((k) => crops[k]!));
      batch.forEach((k, n) => (results[k] = read[n]!));
      done += batch.length;
      onProgress?.(done, crops.length);
      i = j;
    }
    return quads
      .map((quad, i) => ({ quad, text: results[i]!.text.replace(/\s+/g, " ").trim(), confidence: results[i]!.confidence, stroke: crops[i]!.stroke }))
      .filter((line) => line.text && line.confidence >= MIN_CONFIDENCE);
  }

  async release(): Promise<void> {
    await Promise.allSettled([this.detector.release(), this.recogniser.release()]);
  }
}
