/**
 * The reader for pictures and scans, as the app provides it to the import engine.
 *
 * ONNX Runtime Web is served from this site (see next.config.mjs) and loaded only when someone imports a
 * picture or a scanned PDF. It runs the models in its own worker, so the page stays responsive while a CV
 * is being read.
 */
import type { OcrOptions, OcrProgress, OrtModule } from "@thaflow/import-engine";

const ORT_PATH = process.env.NEXT_PUBLIC_ORT_PATH ?? "/ort/";
/** Operators can serve the models themselves by setting this to a folder that mirrors ThaOCR's layout. */
export const MODEL_BASE = process.env.NEXT_PUBLIC_THAFLOW_OCR_MODELS || undefined;

interface OrtRuntime extends OrtModule {
  env: { wasm: { wasmPaths?: string; numThreads?: number; proxy?: boolean } };
}

/** The smallest possible model (one Identity node): creating it proves the runtime's worker has started. */
const PROBE = "CAcSADo3ChAKAXgSAXkiCElkZW50aXR5EgFwWg8KAXgSCgoICAESBAoCCAFiDwoBeRIKCggIARIECgIIAUIECgAQDQ==";

function inject(fresh: boolean): Promise<OrtRuntime> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // A runtime whose worker failed cannot be started again: a second copy has to be a new script.
    script.src = `${ORT_PATH}ort.wasm.min.js${fresh ? "?page" : ""}`;
    script.async = true;
    script.onload = () => {
      const ort = (window as unknown as { ort?: OrtRuntime }).ort;
      if (ort) resolve(ort);
      else reject(new Error("runtime missing"));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("runtime not loaded"));
    };
    document.head.appendChild(script);
  });
}

function configure(ort: OrtRuntime, proxy: boolean): OrtRuntime {
  ort.env.wasm.wasmPaths = new URL(ORT_PATH, location.href).href;
  // More threads need a cross-origin isolated page, which static hosting cannot promise.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = proxy;
  return ort;
}

let runtime: Promise<OrtModule> | null = null;

async function start(): Promise<OrtModule> {
  const ort = configure(await inject(false), true);
  try {
    const bytes = Uint8Array.from(atob(PROBE), (c) => c.charCodeAt(0));
    const probe = await Promise.race([
      ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("worker did not start")), 120_000)),
    ]);
    await probe.release().catch(() => undefined);
    return ort;
  } catch {
    // No worker (an old browser, or a policy that blocks it): run the models on the page instead.
    return configure(await inject(true), false);
  }
}

export function loadOcrRuntime(): Promise<OrtModule> {
  if (!runtime) {
    runtime = start();
    runtime.catch(() => (runtime = null));
  }
  return runtime;
}

/** Options for importCVFile that let it read pictures and scans. */
export function ocrOptions(onProgress?: (progress: OcrProgress) => void): OcrOptions {
  return { runtime: loadOcrRuntime, ...(MODEL_BASE ? { modelBase: MODEL_BASE } : {}), ...(onProgress ? { onProgress } : {}) };
}
