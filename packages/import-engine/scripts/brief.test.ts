/** Not a unit test: prints a short, readable account of what the importer made of each file in a folder. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { importCVBytes } from "../src";

test("brief", async () => {
  const dir = process.env.IMPORT_BRIEF ?? "";
  const out: string[] = [];
  for (const file of readdirSync(dir).filter((f) => /\.(pdf|docx)$/.test(f)).sort()) {
    try {
      const { data, warnings } = await importCVBytes(new Uint8Array(readFileSync(join(dir, file))));
      const p = data.personal;
      out.push(
        `== ${file} ${warnings.join(",")}`,
        `  name=${p.fullName} | headline=${p.headline} | location=${p.location} | ${p.email} | ${p.phone}`,
        `  summary: ${data.summary.slice(0, 70)}`,
        ...data.experiences.map((e) => `  job: ${e.position} @ ${e.company} (${e.location ?? ""}) [${e.startDate ?? ""}/${e.endDate ?? ""}] ${e.description.replace(/\n/g, " / ").slice(0, 90)}`),
        ...data.education.map((e) => `  school: ${e.institution} | ${e.degree ?? ""} | ${e.fieldOfStudy ?? ""} (${e.location ?? ""}) [${e.startDate ?? ""}/${e.endDate ?? ""}]`),
        ...data.projects.map((e) => `  project: ${e.name} | ${e.role ?? ""} | ${e.description.replace(/\n/g, " / ").slice(0, 90)}`),
        ...data.skills.map((g) => `  skills[${g.category}]: ${g.skills.map((s) => s.name).join("; ")}`),
        `  languages: ${data.languages.map((l) => `${l.name}=${l.proficiency ?? ""}`).join("; ")}`,
        data.certifications.length ? `  certs: ${data.certifications.map((c) => c.name).join("; ")}` : "",
        data.unplaced.length ? `  unplaced: ${data.unplaced.join(" // ").slice(0, 200)}` : "",
      );
    } catch (error) {
      out.push(`== ${file} ERROR ${String(error)}`);
    }
  }
  console.log(out.filter(Boolean).join("\n"));
}, 600_000);
