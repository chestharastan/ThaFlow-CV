/**
 * CVs that did not come from our own templates: the same CV laid out the way other tools lay CVs out
 * (sidebars, narrow gutters, tables, dates in a margin). The fixtures are made by
 * scripts/foreign/make.mjs. Whatever the layout, the same facts must come out.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importCVBytes, type ImportedCV } from "../src";

const LAYOUTS = ["sidebar-left", "sidebar-right", "narrow-gutter", "sidebar-dark", "table", "plain", "mixed", "dates-left"] as const;
const SKILLS = ["Python", "SQL", "JavaScript", "TypeScript", "React", "Next.js", "Django", "FastAPI", "Flutter", "PyTorch", "TensorFlow", "Scikit-learn", "OpenCV", "Hugging Face", "PostgreSQL", "MySQL", "Matplotlib", "Seaborn", "Git/GitHub", "Linux", "Microsoft Office"];

const read = async (layout: string): Promise<ImportedCV> => (await importCVBytes(new Uint8Array(readFileSync(join(__dirname, "fixtures", "foreign", `${layout}.pdf`))))).data;

describe.each(LAYOUTS)("a CV laid out as %s", (layout) => {
  it("reads who the person is, and tells the job title from the address", async () => {
    const { personal } = await read(layout);
    expect(personal).toMatchObject({
      fullName: "Dara Sok",
      headline: "DATA SCIENCE & ENGINEERING",
      email: "dara.sok@example.com",
      phone: "+855 12 345 678",
      location: "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh",
    });
  });

  it("keeps each job whole: title, employer, dates and what was done", async () => {
    const { experiences } = await read(layout);
    expect(experiences.map((e) => [e.position, e.company, e.startDate, e.endDate])).toEqual([
      ["Teaching Assistant", "Royal University of Phnom Penh", "2025-04", "2026-04"],
      ["Student Ambassador", "Faculty of Engineering, RUPP", "2023", "2024"],
    ]);
    expect(experiences[0]!.description).toContain("Supported the Data Science and Programming course for 120 students");
    expect(experiences[0]!.description).toContain("Marked weekly labs and ran revision sessions before exams");
    expect(experiences[1]!.description).toContain("Organised two open days with the faculty office");
  });

  it("lists the skills and nothing else under skills", async () => {
    const { skills } = await read(layout);
    const names = skills.flatMap((g) => g.skills.map((s) => s.name));
    expect([...names].sort()).toEqual([...SKILLS].sort());
  });

  it("reads education and projects from their own sections", async () => {
    const { education, projects } = await read(layout);
    expect(education).toHaveLength(1);
    expect(education[0]).toMatchObject({ institution: "Royal University of Phnom Penh (RUPP)", degree: "Bachelor of Engineering", fieldOfStudy: "Data Science and Engineering", startDate: "2021", endDate: "2025" });
    expect(projects.map((p) => p.name)).toEqual(["Khmer OCR Thesis & ThaOCR (Ongoing)", "Web & Mobile Apps"]);
    expect(projects[0]!.description).toContain("accuracy testing (CER/WER)");
    expect(projects[1]!.description).toContain("Built course projects with React, Django and Flutter for local small businesses");
  });

  it("leaves nothing behind", async () => {
    const { unplaced } = await read(layout);
    expect(unplaced).toEqual([]);
  });
});

describe("skill groups", () => {
  it.each(["sidebar-left", "narrow-gutter", "table", "mixed", "dates-left"])("keeps the names of the groups in %s", async (layout) => {
    const { skills } = await read(layout);
    expect(skills.map((g) => g.category)).toEqual(["Programming", "Web & Mobile", "Machine Learning", "Data", "Tools"]);
    expect(skills[2]!.skills.map((s) => s.name)).toEqual(["PyTorch", "TensorFlow", "Scikit-learn", "OpenCV", "Hugging Face"]);
  });
});
