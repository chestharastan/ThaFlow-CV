import { describe, expect, it } from "vitest";
import { createEmptyCV } from "@thaflow/cv-core";
import { sampleCV } from "../../cv-core/test/fixtures";
import {
  checkSuggestionIntegrity,
  classifyText,
  createRuleEngine,
  dedupeSkills,
  defaultRules,
  detectLanguage,
  extractYears,
  splitSkillList,
} from "../src";

const engine = createRuleEngine();
const ids = (cv = sampleCV(), locale: "en" | "km" = "en") => engine.run(cv, { locale }).results.map((r) => r.ruleId);

describe("rule registry", () => {
  it("has unique ids and descriptions", () => {
    expect(new Set(defaultRules.map((r) => r.id)).size).toBe(defaultRules.length);
    expect(defaultRules.every((r) => r.description.length > 0)).toBe(true);
  });

  it("passes a healthy CV with no errors or warnings", () => {
    const report = engine.run(sampleCV());
    expect(report.counts.error).toBe(0);
    expect(report.counts.warning).toBe(0);
    expect(report.completeness).toBe(100);
  });

  it("flags an empty CV without throwing", () => {
    const found = ids(createEmptyCV());
    expect(found).toEqual(expect.arrayContaining(["REQ-001", "REQ-002", "CMP-001", "CNT-004"]));
  });
});

describe("validation rules", () => {
  it("flags bad email, bad date and reversed dates", () => {
    const cv = sampleCV();
    cv.personal.email = "dara@";
    cv.experiences[0]!.startDate = "2025-01";
    cv.experiences[0]!.endDate = "2024-01";
    cv.education[0]!.endDate = "June 2021";
    expect(ids(cv)).toEqual(expect.arrayContaining(["VAL-001", "DATE-001", "DATE-002"]));
  });

  it("reports the offending field path", () => {
    const cv = sampleCV();
    cv.experiences[0]!.endDate = "2020";
    const hit = engine.run(cv).results.find((r) => r.ruleId === "DATE-002");
    expect(hit?.field).toBe("experiences.exp1.endDate");
    expect(hit?.severity).toBe("error");
  });

  it("flags current job with end date, duplicates and vague wording", () => {
    const cv = sampleCV();
    cv.experiences[0]!.isCurrent = true;
    cv.experiences[0]!.description = "Responsible for various tasks and stuff";
    cv.skills[0]!.skills.push({ id: "s3", name: "react " });
    expect(ids(cv)).toEqual(expect.arrayContaining(["EXP-002", "SKL-001", "CNT-001", "CNT-003"]));
  });

  it("localizes messages and skips English-only rules for Khmer CVs", () => {
    const cv = createEmptyCV({ language: "km" });
    cv.summary = "Responsible for stuff";
    const report = engine.run(cv);
    expect(report.results.find((r) => r.ruleId === "REQ-001")?.message).toMatch(/[ក-៿]/);
    expect(report.results.some((r) => r.ruleId === "CNT-001")).toBe(false);
  });
});

describe("normalization + classification", () => {
  it("dedupes and splits skills", () => {
    expect(splitSkillList("React, Node.js; SQL\n- react")).toEqual(["React", "Node.js", "SQL"]);
    const groups = dedupeSkills([
      { id: "a", category: "A", skills: [{ id: "1", name: "React" }, { id: "2", name: "react" }] },
      { id: "b", category: "B", skills: [{ id: "3", name: "REACT" }, { id: "4", name: "Go" }] },
    ]);
    expect(groups.map((g) => g.skills.map((s) => s.name))).toEqual([["React"], ["Go"]]);
  });

  it("detects language", () => {
    expect(detectLanguage("I studied at RUPP")).toBe("en");
    expect(detectLanguage("ខ្ញុំបានសិក្សានៅ RUPP")).toBe("km");
  });

  it("classifies informal text", () => {
    expect(classifyText("I studied at RUPP computer science and graduated in 2025.").section).toBe("education");
    expect(classifyText("I worked at ABA Bank as a teller for two years").section).toBe("experiences");
    expect(classifyText("React, TypeScript, Node.js, SQL").section).toBe("skills");
    expect(classifyText("ខ្ញុំបានបញ្ចប់ការសិក្សានៅសាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ").section).toBe("education");
    expect(classifyText("12345").section).toBe("unknown");
    expect(extractYears("from 2019 to ២០២៣")).toEqual(["2019", "2023"]);
  });
});

describe("suggestion integrity", () => {
  it("accepts faithful rewrites", () => {
    expect(checkSuggestionIntegrity("I build websites using React", "Developed websites using React.")).toEqual([]);
  });

  it("flags invented numbers and claims", () => {
    const findings = checkSuggestionIntegrity(
      "I build websites using React",
      "Led a team that increased conversion by 40% using React.",
    );
    expect(findings.map((f) => f.kind)).toEqual(expect.arrayContaining(["new-number", "new-claim"]));
  });

  it("treats Khmer digits as the same number", () => {
    expect(checkSuggestionIntegrity("មានបទពិសោធន៍ ៣ ឆ្នាំ", "3 years of experience")).toEqual([]);
  });
});
