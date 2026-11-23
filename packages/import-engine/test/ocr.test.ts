/**
 * The parts of the picture reader that are plain arithmetic: turning the detector's output into line
 * boxes, decoding the recogniser's output, and placing what was read on the page. The models themselves
 * run only in a browser and are exercised by the browser test.
 */
import { describe, expect, it } from "vitest";
import { detectImportSource, importCVBytes } from "../src";
import { decodeLine } from "../src/ocr/ctc";
import type { OcrLine } from "../src/ocr/engine";
import { boundsOf, boxesFromProbability, detectionSize, minAreaRect, orderCorners, type Point, type Quad } from "../src/ocr/geometry";
import { itemsFromLines } from "../src/ocr/index";
import { linesFromPages } from "../src/layout";


describe("finding lines in the detector's output", () => {
  it("resizes a page so its long side is in range and both sides suit the model", () => {
    expect(detectionSize(1588, 2246, 1600, 2200)).toEqual([1568, 2208]);
    expect(detectionSize(4000, 3000, 1600, 2200)).toEqual([2208, 1664]);
    // Small pictures are enlarged, but never more than three times.
    expect(detectionSize(300, 200, 1600, 2200)).toEqual([896, 608]);
    for (const side of detectionSize(1001, 777, 1600, 2200)) expect(side % 32).toBe(0);
  });

  it("boxes each blob of text, grown back to the height of the line, in page coordinates", () => {
    const width = 100;
    const height = 60;
    const prob = new Float32Array(width * height);
    const paint = (x0: number, y0: number, x1: number, y1: number, value: number) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) prob[y * width + x] = value;
    };
    paint(10, 10, 70, 16, 0.9); // a line of text
    paint(10, 30, 40, 36, 0.8); // a shorter one
    paint(80, 50, 82, 52, 0.9); // a speck
    paint(50, 44, 90, 49, 0.35); // faint: above the pixel threshold, below the box threshold
    const boxes = boxesFromProbability(prob, width, height, 200, 120);
    expect(boxes).toHaveLength(2);
    const [left, top, right, bottom] = boundsOf(boxes[0]!.quad);
    // The page is twice the map's size, and the box is wider and taller than the blob's core.
    expect(left).toBeLessThan(20);
    expect(right).toBeGreaterThan(140);
    expect(bottom - top).toBeGreaterThan(12);
    expect(boxes[0]!.score).toBeCloseTo(0.9, 5);
    expect(boundsOf(boxes[1]!.quad)[1]).toBeGreaterThan(bottom);
  });

  it("fits the tightest rectangle round a tilted line", () => {
    const angle = 0.3;
    const corner = (u: number, v: number): Point => [50 + u * Math.cos(angle) - v * Math.sin(angle), 50 + u * Math.sin(angle) + v * Math.cos(angle)];
    const rect = minAreaRect([corner(-30, -5), corner(30, -5), corner(30, 5), corner(-30, 5), corner(0, 0)]);
    expect([Math.max(rect.w, rect.h), Math.min(rect.w, rect.h)].map((n) => Math.round(n))).toEqual([60, 10]);
    expect(rect.cx).toBeCloseTo(50, 5);
    expect(rect.cy).toBeCloseTo(50, 5);
  });

  it("puts corners in reading order", () => {
    expect(orderCorners([[90, 40], [10, 10], [10, 40], [90, 10]])).toEqual([[10, 10], [90, 10], [90, 40], [10, 40]]);
  });
});

describe("decoding the recogniser's output", () => {
  const alphabet = ["", "a", "b", "ក"];
  /** Scores for one line: at each step the given character wins. */
  const scores = (steps: number[], lines = 1, line = 0) => {
    const out = new Float32Array(steps.length * lines * alphabet.length).fill(-5);
    steps.forEach((best, step) => (out[(step * lines + line) * alphabet.length + best] = 5));
    return out;
  };

  it("collapses repeats and drops blanks", () => {
    const steps = [1, 1, 0, 1, 2, 2, 0, 0, 3];
    expect(decodeLine(scores(steps), [steps.length, 1, 4], 0, steps.length, alphabet).text).toBe("aabក");
  });

  it("reads only the steps that belong to the line, not its padding", () => {
    const steps = [1, 0, 2, 0, 3, 3];
    expect(decodeLine(scores(steps), [steps.length, 1, 4], 0, 3, alphabet).text).toBe("ab");
  });

  it("reads the right line of a batch and reports how sure it was", () => {
    const steps = [2, 0, 1];
    const read = decodeLine(scores(steps, 3, 1), [steps.length, 3, 4], 1, steps.length, alphabet);
    expect(read.text).toBe("ba");
    expect(read.confidence).toBeGreaterThan(0.99);
    expect(decodeLine(scores(steps, 3, 1), [steps.length, 3, 4], 0, steps.length, alphabet)).toEqual({ text: "", confidence: 0 });
  });
});

describe("placing what was read on the page", () => {
  /** A line box `w` wide and `h` tall with its top-left at (x, y), optionally turned about the page's middle. */
  const line = (text: string, x: number, y: number, w: number, h = 30, stroke = 3, turn = 0): OcrLine => {
    const spin = ([px, py]: Point): Point => [800 + (px - 800) * Math.cos(turn) - (py - 1100) * Math.sin(turn), 1100 + (px - 800) * Math.sin(turn) + (py - 1100) * Math.cos(turn)];
    return { text, confidence: 0.9, stroke, quad: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map((p) => spin(p as Point)) as Quad };
  };

  it("drops stray marks and reads a mark stuck to a word as a bullet", () => {
    const page = itemsFromLines([line("•", 100, 100, 10), line(".1", 100, 150, 16), line(".Built the app", 100, 200, 300), line("C#", 100, 250, 40), line("Python", 100, 300, 120)], 1600, 2200);
    expect(page.items.map((item) => item.str)).toEqual(["• Built the app", "C#", "Python"]);
  });

  it("gives lines of one face one size, and keeps clearly larger type apart", () => {
    const page = itemsFromLines([line("Dara Sok", 100, 100, 400, 70), line("ran a team", 100, 200, 300, 27), line("Typing quickly", 100, 250, 300, 33), line("managed people", 100, 300, 300, 30)], 1600, 2200);
    const sizes = page.items.map((item) => item.size);
    expect(new Set(sizes.slice(1)).size).toBe(1);
    expect(sizes[0]!).toBeGreaterThan(sizes[1]! * 2);
  });

  it("marks lines with thicker strokes as a heavier face", () => {
    const lines = [line("EXPERIENCE", 100, 100, 300, 30, 5), ...Array.from({ length: 6 }, (_, i) => line(`Did some work ${i}`, 100, 150 + i * 50, 400, 30, 3))];
    const { lines: read } = linesFromPages([itemsFromLines(lines, 1600, 2200)]);
    expect(read.filter((l) => l.emph).map((l) => l.text)).toEqual(["EXPERIENCE"]);
    expect(read.every((l) => l.loose)).toBe(true);
  });

  it("straightens a tilted page, so a label and its value stay on one row", () => {
    const rows = ["Programming", "Web", "Data", "Tools", "Design", "Languages"];
    const tilt = -0.045; // about two and a half degrees
    const tilted = rows.flatMap((label, i) => [line(label, 200, 300 + i * 60, 260, 30, 3, tilt), line(`value ${i} with some more words`, 700, 300 + i * 60, 620, 30, 3, tilt)]);
    const { lines } = linesFromPages([itemsFromLines(tilted, 1600, 2200)]);
    expect(lines.map((l) => [l.text, l.right])).toEqual(rows.map((label, i) => [label, `value ${i} with some more words`]));
  });
});

describe("pictures without a reader", () => {
  it("recognises a picture by its name, its type and its first bytes", () => {
    expect(detectImportSource({ name: "cv.JPG" })).toBe("image");
    expect(detectImportSource({ name: "scan", type: "image/png" })).toBe("image");
    expect(detectImportSource({ name: "IMG_0001.HEIC" })).toBe("image");
    expect(detectImportSource({ name: "notes.txt", type: "text/plain" })).toBeNull();
  });

  it("refuses a picture clearly when no reader is given, rather than guessing", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await expect(importCVBytes(png)).rejects.toMatchObject({ code: "unsupported-type" });
  });
});
