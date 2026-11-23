/**
 * Turning a text detector's probability map into line boxes.
 *
 * The detector (DB, as used by ThaOCR) paints every pixel with how likely it is
 * to be text. This finds the connected blobs, fits the smallest rotated
 * rectangle round each and grows it back to the full height of the line.
 * Pure arithmetic: no canvas, no model.
 */

export type Point = [number, number];
/** Corners in reading order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

export interface DetectedBox {
  quad: Quad;
  /** Mean text probability inside the blob, 0 to 1. */
  score: number;
}

export interface DetectionParams {
  /** A pixel counts as text above this probability. */
  thresh: number;
  /** A blob is kept when its mean probability reaches this. */
  boxThresh: number;
  /** How far a blob is grown back out: the detector marks only the core of each line. */
  unclipRatio: number;
}

export const DETECTION_DEFAULTS: DetectionParams = { thresh: 0.3, boxThresh: 0.5, unclipRatio: 1.6 };

/** Most blobs considered on one page. A CV has a few hundred lines at the very most. */
const MAX_BLOBS = 1500;

/** The size an image is resized to for detection: long side within [longMin, longMax], both sides multiples of 32. */
export function detectionSize(width: number, height: number, longMin: number, longMax: number): [number, number] {
  const long = Math.max(width, height);
  const scale = long < longMin ? Math.min(longMin / long, 3) : long > longMax ? longMax / long : 1;
  const fit = (side: number) => Math.max(32, Math.round((side * scale) / 32) * 32);
  return [fit(width), fit(height)];
}

/** Convex hull, counter-clockwise (Andrew's monotone chain). */
export function convexHull(points: Point[]): Point[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export interface RotatedRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Radians. */
  angle: number;
}

/** The smallest-area rectangle round a set of points (rotating calipers over the hull). */
export function minAreaRect(points: Point[]): RotatedRect {
  const hull = convexHull(points);
  if (hull.length === 0) return { cx: 0, cy: 0, w: 0, h: 0, angle: 0 };
  if (hull.length === 1) return { cx: hull[0]![0], cy: hull[0]![1], w: 1, h: 1, angle: 0 };
  let best: (RotatedRect & { area: number }) | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of hull) {
      const u = p[0] * c + p[1] * s;
      const v = -p[0] * s + p[1] * c;
      if (u < x0) x0 = u;
      if (u > x1) x1 = u;
      if (v < y0) y0 = v;
      if (v > y1) y1 = v;
    }
    const area = (x1 - x0) * (y1 - y0);
    if (!best || area < best.area) {
      const u = (x0 + x1) / 2;
      const v = (y0 + y1) / 2;
      best = { area, cx: u * c - v * s, cy: u * s + v * c, w: x1 - x0, h: y1 - y0, angle };
    }
  }
  return best!;
}

function corners(rect: RotatedRect): Point[] {
  const c = Math.cos(rect.angle);
  const s = Math.sin(rect.angle);
  const hw = rect.w / 2;
  const hh = rect.h / 2;
  return (
    [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ] as Point[]
  ).map(([u, v]) => [rect.cx + u * c - v * s, rect.cy + u * s + v * c]);
}

/** Put four corners in reading order: top-left, top-right, bottom-right, bottom-left. */
export function orderCorners(points: Point[]): Quad {
  const sum = points.map((p) => p[0] + p[1]);
  const diff = points.map((p) => p[1] - p[0]);
  const least = (values: number[]) => values.indexOf(Math.min(...values));
  const most = (values: number[]) => values.indexOf(Math.max(...values));
  return [points[least(sum)]!, points[least(diff)]!, points[most(sum)]!, points[most(diff)]!];
}

export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Upright bounding box of a quad: [left, top, right, bottom]. */
export function boundsOf(quad: Point[]): [number, number, number, number] {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Pixel indices of each 8-connected blob in a 0/1 mask. */
function blobs(mask: Uint8Array, width: number, height: number): number[][] {
  const label = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  const found: number[][] = [];
  for (let start = 0; start < width * height && found.length < MAX_BLOBS; start++) {
    if (!mask[start] || label[start]) continue;
    const id = found.length + 1;
    const pixels: number[] = [];
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    while (top) {
      const p = stack[--top]!;
      pixels.push(p);
      const px = p % width;
      const py = (p - px) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const qx = px + dx;
          const qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= width || qy >= height) continue;
          const q = qy * width + qx;
          if (mask[q] && !label[q]) {
            label[q] = id;
            stack[top++] = q;
          }
        }
      }
    }
    found.push(pixels);
  }
  return found;
}

/** Drop a small box that sits inside a much larger one (a dot or accent detected on its own). */
function dropContained(boxes: DetectedBox[], share = 0.55, tiny = 0.08): DetectedBox[] {
  const bounds = boxes.map((b) => boundsOf(b.quad));
  const area = bounds.map((b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]));
  const overlap = (a: number[], b: number[]) =>
    Math.max(0, Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!)) * Math.max(0, Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!));
  const keep: number[] = [];
  for (const i of boxes.map((_, k) => k).sort((a, b) => area[b]! - area[a]!)) {
    const inside = keep.some((j) => area[i]! > 0 && overlap(bounds[i]!, bounds[j]!) / area[i]! > share && area[i]! < tiny * area[j]!);
    if (!inside) keep.push(i);
  }
  return keep.sort((a, b) => a - b).map((i) => boxes[i]!);
}

/**
 * Line boxes from a probability map.
 *
 * @param prob    probabilities, row by row, `mapWidth * mapHeight` long
 * @param width   width of the image the boxes should be expressed in
 * @param height  height of that image
 */
export function boxesFromProbability(
  prob: ArrayLike<number>,
  mapWidth: number,
  mapHeight: number,
  width: number,
  height: number,
  params: DetectionParams = DETECTION_DEFAULTS,
): DetectedBox[] {
  const size = mapWidth * mapHeight;
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i++) mask[i] = prob[i]! > params.thresh ? 1 : 0;
  const sx = width / mapWidth;
  const sy = height / mapHeight;
  const out: DetectedBox[] = [];
  for (const pixels of blobs(mask, mapWidth, mapHeight)) {
    if (pixels.length < 4) continue;
    // The outline of the blob: every pixel with a neighbour outside it, as its two opposite corners.
    const outline: Point[] = [];
    let sum = 0;
    for (const q of pixels) {
      const x = q % mapWidth;
      const y = (q - x) / mapWidth;
      sum += prob[q]!;
      const edge = x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1 || !mask[q - 1] || !mask[q + 1] || !mask[q - mapWidth] || !mask[q + mapWidth];
      if (edge) outline.push([x, y], [x + 1, y + 1]);
    }
    const rect = minAreaRect(outline);
    if (Math.min(rect.w, rect.h) < 3) continue;
    const score = sum / pixels.length;
    if (score < params.boxThresh) continue;
    const grow = (rect.w * rect.h * params.unclipRatio) / (2 * (rect.w + rect.h));
    const grown = corners({ ...rect, w: rect.w + 2 * grow, h: rect.h + 2 * grow }).map(
      ([x, y]): Point => [Math.min(width - 1, Math.max(0, x * sx)), Math.min(height - 1, Math.max(0, y * sy))],
    );
    const quad = orderCorners(grown);
    if (Math.min(distance(quad[1], quad[0]), distance(quad[3], quad[0])) < 5) continue;
    out.push({ quad, score });
  }
  return dropContained(out);
}
