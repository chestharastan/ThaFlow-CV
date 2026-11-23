import { readFileSync } from "node:fs";
import { test } from "vitest";
import { extractPdfLines } from "../src";

test("lines", async () => {
  for (const file of (process.env.IMPORT_LINES ?? "").split(",")) {
    const { lines, warnings } = await extractPdfLines(new Uint8Array(readFileSync(file)));
    console.log(`== ${file} ${warnings}\n` + lines.slice(0, Number(process.env.IMPORT_LINES_N ?? 26)).map((l) => `${String(l.size).padStart(5)} ${l.emph ? "E" : " "} ${JSON.stringify(l.text)}${l.right ? "  >>  " + JSON.stringify(l.right) : ""}`).join("\n"));
  }
}, 120_000);
