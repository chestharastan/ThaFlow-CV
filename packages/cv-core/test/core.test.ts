import { describe, expect, it } from "vitest";
import {
  CVValidationError,
  SECTION_KEYS,
  createEmptyCV,
  durationInMonths,
  formatDateRange,
  getTextAtPath,
  isValidPartialDate,
  migrateCV,
  parseBackup,
  serializeBackup,
  setTextAtPath,
} from "../src";
import { sampleCV } from "./fixtures";

describe("factory + migrations", () => {
  it("creates a CV that passes its own schema", () => {
    const cv = createEmptyCV({ target: "student" });
    expect(migrateCV(cv)).toEqual(cv);
    expect(cv.appearance.sectionOrder[1]).toBe("education");
    expect([...cv.appearance.sectionOrder].sort()).toEqual([...SECTION_KEYS].sort());
  });

  it("fills defaults for sparse data and completes sectionOrder", () => {
    const cv = migrateCV({
      id: "x",
      metadata: { createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      personal: {},
      appearance: { sectionOrder: ["skills"] },
    });
    expect(cv.personal.fullName).toBe("");
    expect(cv.experiences).toEqual([]);
    expect(cv.appearance.sectionOrder[0]).toBe("skills");
    expect(cv.appearance.sectionOrder).toHaveLength(SECTION_KEYS.length);
  });

  it("rejects garbage and newer schema versions", () => {
    expect(() => migrateCV("nope")).toThrow(CVValidationError);
    expect(() => migrateCV({ ...sampleCV(), metadata: { ...sampleCV().metadata, version: 99 } })).toThrow(/newer/);
  });
});

describe("backup", () => {
  it("round-trips content with fresh ids", () => {
    const cv = sampleCV();
    const [restored] = parseBackup(serializeBackup([cv]));
    expect(restored!.id).not.toBe(cv.id);
    expect({ ...restored, id: cv.id }).toEqual(cv);
  });

  it("accepts a bare CV and rejects other JSON", () => {
    expect(parseBackup(JSON.stringify(sampleCV()))).toHaveLength(1);
    expect(() => parseBackup("{}")).toThrow(CVValidationError);
    expect(() => parseBackup("not json")).toThrow(CVValidationError);
  });
});

describe("dates", () => {
  it("validates and formats partial dates", () => {
    expect(isValidPartialDate("2024")).toBe(true);
    expect(isValidPartialDate("2024-13")).toBe(false);
    expect(formatDateRange("2022-01", undefined, true, "en")).toBe("Jan 2022 – Present");
    expect(formatDateRange("2022-01", "2024", false, "km")).toBe("មករា 2022 – 2024");
  });

  it("computes duration deterministically", () => {
    expect(durationInMonths("2022-01", "2022-12", false)).toBe(12);
    expect(durationInMonths("2024-01", undefined, true, new Date(2024, 2, 15))).toBe(3);
    expect(durationInMonths("2024-01", "2023-01", false)).toBeNull();
  });
});

describe("paths", () => {
  it("reads and writes text by id path without mutating", () => {
    const cv = sampleCV();
    expect(getTextAtPath(cv, "experiences.exp1.position")).toBe("Frontend Developer");
    const next = setTextAtPath(cv, "experiences.exp1.achievements.0", "Changed");
    expect(next.experiences[0]!.achievements[0]).toBe("Changed");
    expect(cv.experiences[0]!.achievements[0]).not.toBe("Changed");
    expect(setTextAtPath(cv, "experiences.missing.position", "x")).toBe(cv);
  });
});
