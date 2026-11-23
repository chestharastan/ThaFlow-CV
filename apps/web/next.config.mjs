import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The pdf.js worker is served from our own origin (it is used only when someone imports an existing CV
// from a PDF, which is read on their device). Copying it here means it is in place however Next is started.
const here = dirname(fileURLToPath(import.meta.url));
const pdfjs = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
mkdirSync(join(here, "public"), { recursive: true });
copyFileSync(join(pdfjs, "build", "pdf.worker.min.mjs"), join(here, "public", "pdf.worker.min.mjs"));

// Reading a CV from a picture or a scan runs two small models in WebAssembly (ONNX Runtime). The runtime is
// served from our own origin too, under its version so a new release is never mixed with a cached old one.
// (The package does not let its package.json be resolved, so find it from the main entry: <root>/dist/<file>.)
const ort = dirname(dirname(createRequire(import.meta.url).resolve("onnxruntime-web")));
const ortVersion = JSON.parse(readFileSync(join(ort, "package.json"), "utf8")).version;
const ortPath = `/ort/${ortVersion}/`;
mkdirSync(join(here, "public", "ort", ortVersion), { recursive: true });
for (const file of ["ort.wasm.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  copyFileSync(join(ort, "dist", file), join(here, "public", "ort", ortVersion, file));
}
// pdf.js needs its own decoders to draw some scanned PDFs (JPEG 2000, JBIG2).
mkdirSync(join(here, "public", "pdfjs", "wasm"), { recursive: true });
for (const file of readdirSync(join(pdfjs, "wasm"))) {
  if (/^(openjpeg|jbig2|qcms).*\.(wasm|js)$/.test(file)) copyFileSync(join(pdfjs, "wasm", file), join(here, "public", "pdfjs", "wasm", file));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_ORT_PATH: ortPath },
  // Fully static: the app has no server of its own, so there is nowhere for CV data to be stored remotely.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: [
    "@thaflow/ai-engine",
    "@thaflow/cv-core",
    "@thaflow/export-engine",
    "@thaflow/import-engine",
    "@thaflow/localization",
    "@thaflow/questionnaire",
    "@thaflow/rule-engine",
    "@thaflow/storage",
    "@thaflow/template-engine",
  ],
};

export default nextConfig;
