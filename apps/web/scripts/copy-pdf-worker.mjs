// Copies the pdf.js worker into public/ so it is served from our own origin.
// It is used only when someone imports an existing CV from a PDF, and the file is parsed on their device.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("pdfjs-dist/package.json")), "build", "pdf.worker.min.mjs");
const target = fileURLToPath(new URL("../public/pdf.worker.min.mjs", import.meta.url));
await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
