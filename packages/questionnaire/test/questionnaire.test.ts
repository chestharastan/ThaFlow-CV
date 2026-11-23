import { describe, expect, it } from "vitest";
import { createEmptyCV } from "@thaflow/cv-core";
import { sampleCV } from "../../cv-core/test/fixtures";
import { getProgress, getSteps } from "../src";

describe("questionnaire", () => {
  it("orders steps by target and always starts with personal details", () => {
    for (const target of ["student", "professional", "academic", "general"] as const) {
      expect(getSteps(target)[0]!.id).toBe("personal");
    }
    expect(getSteps("student")[1]!.id).toBe("education");
    expect(getSteps("professional")[1]!.id).toBe("experiences");
  });

  it("tracks progress against the CV document", () => {
    expect(getProgress(createEmptyCV({ target: "professional" }))).toMatchObject({ answered: 0, nextRequired: "personal" });
    const progress = getProgress(sampleCV());
    expect(progress.answered).toBe(5);
    expect(progress.nextRequired).toBeUndefined();
  });
});
