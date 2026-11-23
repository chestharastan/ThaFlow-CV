/**
 * Not a unit test: runs the importer over a folder of PDFs/DOCX files and prints what it recognised.
 *   IMPORT_EVAL_DIR=path pnpm exec vitest run --config packages/import-engine/scripts/evaluate.config.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { importCVBytes } from "../src";

test("evaluate", async () => {
  const dir = process.env.IMPORT_EVAL_DIR ?? "";
  const files = readdirSync(dir).filter((f) => /\.(pdf|docx)$/.test(f)).sort();
  const rows: string[] = [];
  for (const file of files) {
    try {
      const { data, warnings } = await importCVBytes(new Uint8Array(readFileSync(join(dir, file))));
      const e = data.experiences;
      rows.push(
        [
          file.padEnd(22),
          `name=${JSON.stringify(data.personal.fullName ?? "")}`.padEnd(22),
          `head=${data.personal.headline ? "y" : "-"} mail=${data.personal.email ? "y" : "-"} tel=${data.personal.phone ? "y" : "-"} loc=${data.personal.location ? "y" : "-"}`,
          `sum=${data.summary.length} exp=${e.length} edu=${data.education.length} skl=${data.skills.reduce((n, g) => n + g.skills.length, 0)} prj=${data.projects.length} cert=${data.certifications.length} lang=${data.languages.length} awd=${data.awards.length}`,
          `| ${e.map((x) => `${x.position}@${x.company}[${x.startDate ?? ""}/${x.isCurrent ? "now" : (x.endDate ?? "")}]`).join("; ").slice(0, 150)}`,
          warnings.length ? `| ${warnings.join(",")}` : "",
          process.env.IMPORT_EVAL_VERBOSE ? `\n${JSON.stringify(data, null, 1)}` : "",
        ].join(" "),
      );
    } catch (error) {
      rows.push(`${file.padEnd(22)} ERROR ${String(error)}`);
    }
  }
  console.log(rows.join("\n"));
}, 600_000);
