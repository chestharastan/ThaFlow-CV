import { defineConfig } from "vitest/config";

/**
 * Runs the visual harness (gallery.run.ts) through Vitest, which is the
 * TypeScript/TSX runner this repository already has. See gallery.run.ts.
 */
export default defineConfig({
  test: {
    include: ["packages/template-engine/scripts/gallery.run.ts"],
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
});
