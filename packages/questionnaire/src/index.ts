import type { CVDocument, CVTarget, SectionKey } from "@thaflow/cv-core";

export type StepId = "personal" | SectionKey;

export interface QuestionnaireStep {
  id: StepId;
  /** Localization key for the step title: `guide.<id>.title`. */
  titleKey: string;
  /** Localization key for the guidance shown above the form. */
  helpKey: string;
  optional: boolean;
}

const step = (id: StepId, optional: boolean): QuestionnaireStep => ({
  id,
  titleKey: `guide.${id}.title`,
  helpKey: `guide.${id}.help`,
  optional,
});

/**
 * Ordered questionnaire steps for a CV target. The engine only decides *what
 * to ask and in which order*; answers are written straight into the CV
 * document, which stays the single source of truth.
 */
export function getSteps(target: CVTarget): QuestionnaireStep[] {
  const flows: Record<CVTarget, [StepId, boolean][]> = {
    student: [
      ["personal", false],
      ["education", false],
      ["projects", true],
      ["experiences", true],
      ["skills", false],
      ["languages", true],
      ["awards", true],
      ["summary", true],
    ],
    professional: [
      ["personal", false],
      ["experiences", false],
      ["education", false],
      ["skills", false],
      ["projects", true],
      ["certifications", true],
      ["languages", true],
      ["summary", true],
    ],
    academic: [
      ["personal", false],
      ["education", false],
      ["experiences", false],
      ["projects", true],
      ["awards", true],
      ["certifications", true],
      ["skills", true],
      ["languages", true],
      ["references", true],
      ["summary", true],
    ],
    general: [
      ["personal", false],
      ["experiences", true],
      ["education", true],
      ["skills", false],
      ["projects", true],
      ["languages", true],
      ["summary", true],
    ],
  };
  return flows[target].map(([id, optional]) => step(id, optional));
}

/** Whether the user has entered anything for a step. */
export function isStepAnswered(cv: CVDocument, id: StepId): boolean {
  switch (id) {
    case "personal":
      return cv.personal.fullName.trim().length > 0;
    case "summary":
      return cv.summary.trim().length > 0;
    case "skills":
      return cv.skills.some((g) => g.skills.length > 0);
    default:
      return cv[id].length > 0;
  }
}

export interface QuestionnaireProgress {
  answered: number;
  total: number;
  /** First required step with no answer, if any. */
  nextRequired?: StepId;
}

export function getProgress(cv: CVDocument): QuestionnaireProgress {
  const steps = getSteps(cv.metadata.target);
  const answered = steps.filter((s) => isStepAnswered(cv, s.id)).length;
  const nextRequired = steps.find((s) => !s.optional && !isStepAnswered(cv, s.id))?.id;
  return { answered, total: steps.length, nextRequired };
}
