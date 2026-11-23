/**
 * The reading models, and getting them onto the device.
 *
 * The models are ThaOCR's (text detector and Khmer/Latin recogniser). They are
 * downloaded the first time someone imports a picture or a scan, checked
 * against a known fingerprint, and kept in the browser's cache so the next
 * import starts at once and works offline. Only the models travel: the CV
 * being read is never sent anywhere.
 */
import type { OcrModels } from "./engine";

export interface ModelFile {
  /** Path under the models base URL. */
  file: string;
  bytes: number;
  /** SHA-256 of the file, hex. */
  sha256: string;
}

/** Where ThaOCR publishes its models. */
export const OCR_MODEL_BASE = "https://huggingface.co/Thareah/ThaOCR-models/resolve/main/";

export const OCR_MODEL_FILES = {
  /** DB text detector (PP-OCRv5 mobile, fine-tuned on Khmer documents). */
  detector: { file: "textdet/db_v2.onnx", bytes: 4_759_758, sha256: "606e608bd5e977abc85e426832f539df1988fa00c021b7a0b2a2e9ed2f7430f4" },
  /**
   * CRNN-CTC recogniser for Khmer and Latin text. ThaOCR also publishes an 8-bit version a quarter of the
   * size, but in WebAssembly it reads about six times slower (86 s against 14 s for one page), so the
   * full one is used.
   */
  recogniser: { file: "rec/crnn_m_v3_owner.onnx", bytes: 19_060_368, sha256: "1c32cd5a6c53db6c03de5b5c25198779f7a69ab2c9fe3c139f8312ff812f1f9b" },
  /** The recogniser's alphabet. */
  alphabet: { file: "rec/crnn_m_v3_owner.vocab.json", bytes: 1198, sha256: "fe02948d60822f7ce2097bd62892afbd06c4987d243dabbde42260eaae1113b0" },
} satisfies Record<string, ModelFile>;

/** Total download the first time, in bytes. */
export const OCR_DOWNLOAD_BYTES = Object.values(OCR_MODEL_FILES).reduce((total, file) => total + file.bytes, 0);

const CACHE = "thaflow-cv-ocr-v1";

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE);
  } catch {
    return null; // private browsing, or storage blocked: download each time
  }
}

/** One model file: from the browser's cache when it is there, otherwise downloaded, verified and stored. */
async function fetchModel(base: string, model: ModelFile, onBytes: (loaded: number) => void): Promise<Uint8Array> {
  const url = new URL(model.file, base).href;
  const cache = await openCache();
  const hit = await cache?.match(url);
  if (hit) {
    const bytes = new Uint8Array(await hit.arrayBuffer());
    onBytes(bytes.length);
    return bytes;
  }
  const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok || !response.body) throw new Error(`download failed: ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onBytes(loaded);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  // A model is code of a kind: only run the exact file we expect.
  if (model.sha256 && (await sha256(bytes)) !== model.sha256) throw new Error("model does not match its fingerprint");
  try {
    await cache?.put(url, new Response(bytes as BodyInit, { headers: { "Content-Type": "application/octet-stream" } }));
  } catch {
    // Out of space: carry on without keeping a copy.
  }
  return bytes;
}

/** Whether every model is already on this device. */
export async function modelsAreCached(base: string = OCR_MODEL_BASE): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  const hits = await Promise.all(Object.values(OCR_MODEL_FILES).map((model) => cache.match(new URL(model.file, base).href)));
  return hits.every(Boolean);
}

/** Download (or take from the cache) everything the reader needs. `onProgress` gets bytes so far and in total. */
export async function loadModels(base: string = OCR_MODEL_BASE, onProgress?: (loaded: number, total: number) => void): Promise<OcrModels> {
  const files = OCR_MODEL_FILES;
  const total = OCR_DOWNLOAD_BYTES;
  const progress = { detector: 0, recogniser: 0, alphabet: 0 };
  const report = (key: keyof typeof progress) => (loaded: number) => {
    progress[key] = loaded;
    onProgress?.(progress.detector + progress.recogniser + progress.alphabet, total);
  };
  const [detector, recogniser, vocabulary] = await Promise.all([
    fetchModel(base, files.detector, report("detector")),
    fetchModel(base, files.recogniser, report("recogniser")),
    fetchModel(base, files.alphabet, report("alphabet")),
  ]);
  const parsed: unknown = JSON.parse(new TextDecoder().decode(vocabulary));
  const alphabet = Array.isArray(parsed) ? parsed : (parsed as { itos?: unknown }).itos;
  if (!Array.isArray(alphabet) || alphabet.some((entry) => typeof entry !== "string")) throw new Error("unexpected alphabet file");
  return { detector, recogniser, alphabet: alphabet as string[] };
}
