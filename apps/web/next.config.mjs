import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The pdf.js worker is served from our own origin (it is used only when someone imports an existing CV
// from a PDF, which is read on their device). Copying it here means it is in place however Next is started.
const here = dirname(fileURLToPath(import.meta.url));
const pdfjs = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
mkdirSync(join(here, "public"), { recursive: true });
copyFileSync(join(pdfjs, "build", "pdf.worker.min.mjs"), join(here, "public", "pdf.worker.min.mjs"));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
