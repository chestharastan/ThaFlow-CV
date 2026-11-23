import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: [process.env.IMPORT_LINES ? "packages/import-engine/scripts/lines.test.ts" : "packages/import-engine/scripts/evaluate.test.ts"], testTimeout: 600_000 } });
