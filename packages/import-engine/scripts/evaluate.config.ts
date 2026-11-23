import { defineConfig } from "vitest/config";

const script = process.env.IMPORT_LINES ? "lines" : process.env.IMPORT_BRIEF ? "brief" : "evaluate";

export default defineConfig({ test: { include: [`packages/import-engine/scripts/${script}.test.ts`], testTimeout: 600_000 } });
