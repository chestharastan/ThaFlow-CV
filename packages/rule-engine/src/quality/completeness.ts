import type { CVDocument } from "@thaflow/cv-core";

/** Measurable completeness score (0–100). Deterministic by design: no LLM involved. */
export function computeCompleteness(cv: CVDocument): number {
  const checks: [boolean, number][] = [
    [cv.personal.fullName.trim().length > 0, 15],
    [Boolean(cv.personal.email?.trim() || cv.personal.phone?.trim()), 10],
    [Boolean(cv.personal.location?.trim()), 5],
    [cv.summary.trim().length >= 40, 15],
    [cv.experiences.length > 0 || cv.projects.length > 0, 20],
    [
      cv.experiences.some((e) => e.description.trim() || e.achievements.length > 0) ||
        cv.projects.some((p) => p.description.trim()),
      10,
    ],
    [cv.education.length > 0, 15],
    [cv.skills.some((g) => g.skills.length > 0), 10],
  ];
  return checks.reduce((sum, [ok, weight]) => sum + (ok ? weight : 0), 0);
}
