/**
 * What this device and this browser can do with ThaFlow CV, in terms a person can act on.
 *
 * Detection reads only what the browser already exposes to every page (processor count, a rough memory
 * figure, storage space, whether WebAssembly and service workers exist). Nothing is measured by running
 * work, and nothing is sent anywhere. `assessDevice` is a pure function of what was detected, so the
 * verdicts are the same wherever they are shown (the product page, the dashboard, Help).
 */
import type { MessageKey } from "@thaflow/localization";

export interface DeviceInfo {
  /** Logical processors, when the browser says. */
  threads: number | null;
  /** Rough memory in GB (Chromium browsers only, and capped by them at 8). */
  memoryGB: number | null;
  /** A phone: touch first and a small screen. Tablets count as computers. */
  phone: boolean;
  /** Runs the reading models (and pdf.js's decoders). */
  webAssembly: boolean;
  /** CVs are kept in IndexedDB. */
  storage: boolean;
  /** The app can be kept for offline use. */
  serviceWorker: boolean;
  /** The app is already kept: this page was served by the service worker. */
  offlineReady: boolean;
  quotaBytes: number | null;
  usageBytes: number | null;
  /** Whether the browser has agreed not to clear this site's data under pressure. */
  persisted: boolean | null;
  /** The reading models are already in the browser's cache. Null when that cannot be told. */
  readerCached: boolean | null;
}

/** Whether a cloud AI server is set up and agreed to, from the AI settings. */
export interface AIStatus {
  cloudReady: boolean;
}

export type Verdict = "yes" | "maybe" | "no" | "off";

export type CapabilityId = "write" | "khmer" | "pdf" | "word" | "readFile" | "readPicture" | "offline" | "space" | "ai";

export interface Capability {
  id: CapabilityId;
  verdict: Verdict;
  /** One line saying what it means here. */
  note: MessageKey;
  values?: Record<string, string | number>;
  /** A second line, when there is something more to know. */
  extra?: MessageKey;
}

/** Seconds a page, as a range. Estimates from timing the reader on typical machines, not measured here. */
export interface ReadingEstimate {
  low: number;
  high: number;
}

/**
 * How long reading one page of a photo or a scan should take. The reader runs on one thread, so the
 * speed of a single core matters most; few cores or little memory are a sign of an older or smaller machine.
 */
export function readingEstimate(info: DeviceInfo): ReadingEstimate | null {
  if (!info.webAssembly) return null;
  if (info.phone) return { low: 30, high: 60 };
  if ((info.threads !== null && info.threads <= 2) || (info.memoryGB !== null && info.memoryGB <= 2)) return { low: 25, high: 45 };
  return { low: 15, high: 20 };
}

/** "24 MB", "1.3 GB". */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  if (mb < 1000) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1000;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}

/** What this device can do, in the order it is shown. `readerBytes` is the one-time download for photos and scans. */
export function assessDevice(info: DeviceInfo, ai: AIStatus, readerBytes: number): Capability[] {
  const estimate = readingEstimate(info);
  const size = Math.round(readerBytes / 1_000_000);
  const range: Record<string, number> = estimate ? { low: estimate.low, high: estimate.high } : {};

  const readPicture: Capability = !info.webAssembly
    ? { id: "readPicture", verdict: "no", note: "device.readPicture.no" }
    : info.memoryGB !== null && info.memoryGB < 2
      ? { id: "readPicture", verdict: "maybe", note: "device.readPicture.lowMemory" }
      : info.readerCached
        ? { id: "readPicture", verdict: "yes", note: "device.readPicture.ready", values: range }
        : { id: "readPicture", verdict: "yes", note: "device.readPicture.download", values: { ...range, size } };

  const free = info.quotaBytes !== null && info.usageBytes !== null ? Math.max(0, info.quotaBytes - info.usageBytes) : null;
  const space: Capability = !info.storage
    ? { id: "space", verdict: "no", note: "device.space.none" }
    : free === null
      ? { id: "space", verdict: "yes", note: "device.space.unknown" }
      : {
          id: "space",
          // A CV is tens of kilobytes; under 50 MB free the browser is close to clearing data.
          verdict: free < 50_000_000 ? "maybe" : "yes",
          note: "device.space.ok",
          values: { free: formatBytes(free), used: formatBytes(info.usageBytes ?? 0) },
          ...(info.persisted === false ? { extra: "device.space.mayClear" as MessageKey } : {}),
        };

  return [
    info.storage ? { id: "write", verdict: "yes", note: "device.write.ok" } : { id: "write", verdict: "no", note: "device.write.no" },
    { id: "khmer", verdict: "yes", note: "device.khmer.ok" },
    { id: "pdf", verdict: "yes", note: info.phone ? "device.pdf.phone" : "device.pdf.ok" },
    { id: "word", verdict: "yes", note: "device.word.ok" },
    { id: "readFile", verdict: "yes", note: "device.readFile.ok" },
    readPicture,
    !info.serviceWorker
      ? { id: "offline", verdict: "no", note: "device.offline.no" }
      : { id: "offline", verdict: "yes", note: info.offlineReady ? "device.offline.ok" : "device.offline.soon" },
    space,
    ai.cloudReady ? { id: "ai", verdict: "yes", note: "device.ai.cloud" } : { id: "ai", verdict: "off", note: "device.ai.off" },
  ];
}

/* ---------- Detection (browser only) ---------- */

/** A touch screen: a phone or a tablet (or a touch laptop). */
export function hasTouch(): boolean {
  return (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
}

/** The parts that can be read at once. */
export function detectNow(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const shortSide = Math.min(screen.width, screen.height);
  return {
    threads: typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : null,
    memoryGB: typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 ? nav.deviceMemory : null,
    phone: hasTouch() && shortSide < 600,
    webAssembly: typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function",
    storage: typeof indexedDB !== "undefined",
    serviceWorker: "serviceWorker" in nav,
    offlineReady: Boolean(nav.serviceWorker?.controller),
    quotaBytes: null,
    usageBytes: null,
    persisted: null,
    readerCached: null,
  };
}

/** Everything, including what the browser answers only asynchronously. */
export async function detectDevice(readerCached: () => Promise<boolean>): Promise<DeviceInfo> {
  const info = detectNow();
  const [estimate, persisted, cached] = await Promise.all([
    navigator.storage?.estimate?.().catch(() => undefined),
    navigator.storage?.persisted?.().catch(() => null),
    readerCached().catch(() => null),
  ]);
  return {
    ...info,
    quotaBytes: typeof estimate?.quota === "number" ? estimate.quota : null,
    usageBytes: typeof estimate?.usage === "number" ? estimate.usage : null,
    persisted: typeof persisted === "boolean" ? persisted : null,
    readerCached: cached,
  };
}
