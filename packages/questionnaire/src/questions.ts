import type { CVDocument } from "@thaflow/cv-core";

/**
 * The whole conversation, in the order it is asked.
 *
 * "start" and "source" are the opening: they are asked before a CV exists and
 * only decide how it is created. Every other question reads and writes the CV
 * document, which stays the single source of truth.
 */
export const QUESTION_IDS = [
  "start",
  "source",
  "language",
  "name",
  "title",
  "contact",
  "work",
  "education",
  "projects",
  "skills",
  "languages",
  "about",
] as const;

export type QuestionId = (typeof QUESTION_IDS)[number];
export type OpeningQuestionId = "start" | "source";
export type CVQuestionId = Exclude<QuestionId, OpeningQuestionId>;

/** How a question is answered. The interface picks its control from this. */
export type QuestionKind =
  /** A few big buttons; tapping one answers and moves on. */
  | "choice"
  /** One single-line box. */
  | "text"
  /** One multi-line box. */
  | "longtext"
  /** A few closely related boxes on one screen. */
  | "fields"
  /** A list of entries, each filled in on its own screen. */
  | "entries"
  /** A box of short tags. */
  | "tags"
  /** A short list of rows. */
  | "rows";

export interface Question {
  id: QuestionId;
  phase: "opening" | "cv";
  kind: QuestionKind;
  /** A required question blocks Next until it is answered. Only the name is required. */
  required: boolean;
  /** Whether this question is asked for this CV. */
  applies(cv: CVDocument): boolean;
  /** Whether the CV already holds an answer. */
  answered(cv: CVDocument): boolean;
}

const always = () => true;
const filled = (value: string | undefined) => Boolean(value && value.trim());

/**
 * The answer to "have you worked before?", remembered in the CV itself:
 * `metadata.target` is "professional" for yes and "student" for not yet;
 * anything else means the question has not been answered. Jobs already in the
 * CV (typed or read from a file) always count as yes.
 */
export function workedAnswer(cv: CVDocument): "yes" | "not-yet" | null {
  if (cv.experiences.length > 0) return "yes";
  if (cv.metadata.target === "professional") return "yes";
  if (cv.metadata.target === "student") return "not-yet";
  return null;
}

export const QUESTIONS: readonly Question[] = [
  { id: "start", phase: "opening", kind: "choice", required: true, applies: always, answered: always },
  { id: "source", phase: "opening", kind: "choice", required: true, applies: always, answered: always },
  { id: "language", phase: "cv", kind: "choice", required: true, applies: always, answered: always },
  { id: "name", phase: "cv", kind: "text", required: true, applies: always, answered: (cv) => filled(cv.personal.fullName) },
  { id: "title", phase: "cv", kind: "text", required: false, applies: always, answered: (cv) => filled(cv.personal.headline) },
  {
    id: "contact",
    phase: "cv",
    kind: "fields",
    required: false,
    applies: always,
    answered: (cv) => filled(cv.personal.email) || filled(cv.personal.phone) || filled(cv.personal.location),
  },
  {
    id: "work",
    phase: "cv",
    kind: "entries",
    required: false,
    applies: always,
    // "Yes" with no job added yet is still open; "not yet" is a complete answer.
    answered: (cv) => cv.experiences.length > 0 || workedAnswer(cv) === "not-yet",
  },
  { id: "education", phase: "cv", kind: "entries", required: false, applies: always, answered: (cv) => cv.education.length > 0 },
  {
    id: "projects",
    phase: "cv",
    kind: "entries",
    required: false,
    // Asked when there is no work experience to fill the page, and whenever projects already exist
    // (for example from an imported file) so they can be confirmed.
    applies: (cv) => workedAnswer(cv) !== "yes" || cv.projects.length > 0,
    answered: (cv) => cv.projects.length > 0,
  },
  {
    id: "skills",
    phase: "cv",
    kind: "tags",
    required: false,
    applies: always,
    answered: (cv) => cv.skills.some((group) => group.skills.some((skill) => filled(skill.name))),
  },
  { id: "languages", phase: "cv", kind: "rows", required: false, applies: always, answered: (cv) => cv.languages.some((l) => filled(l.name)) },
  { id: "about", phase: "cv", kind: "longtext", required: false, applies: always, answered: (cv) => filled(cv.summary) },
];

const byId = new Map<QuestionId, Question>(QUESTIONS.map((question) => [question.id, question]));
const orderOf = (id: QuestionId) => QUESTION_IDS.indexOf(id);

export const FIRST_QUESTION: OpeningQuestionId = "start";
export const FIRST_CV_QUESTION: CVQuestionId = "language";

export function isQuestionId(value: unknown): value is QuestionId {
  return typeof value === "string" && (QUESTION_IDS as readonly string[]).includes(value);
}

export function isOpeningQuestion(id: QuestionId): id is OpeningQuestionId {
  return id === "start" || id === "source";
}

export function getQuestion(id: QuestionId): Question {
  return byId.get(id)!;
}

/* ---------- The opening ---------- */

export type OpeningAnswer = "yes" | "no" | "file" | "type";

/** The choices each opening question offers, in display order. */
export const OPENING_ANSWERS: Record<OpeningQuestionId, readonly OpeningAnswer[]> = {
  start: ["yes", "no"],
  source: ["file", "type"],
};

/** What an opening answer leads to: another question, or creating the CV (blank, or from a file). */
export type OpeningOutcome = { ask: OpeningQuestionId } | { create: "blank" | "import" };

/**
 * The opening branch: "Do you already have a CV?" Yes leads to "start from it?";
 * choosing a file starts from what it contains. No, or having one but preferring
 * to type, both continue as a new user with a blank CV.
 */
export function answerOpening(question: OpeningQuestionId, answer: OpeningAnswer): OpeningOutcome {
  if (question === "start" && answer === "yes") return { ask: "source" };
  if (question === "source" && answer === "file") return { create: "import" };
  return { create: "blank" };
}

/* ---------- Order ---------- */

/** The questions asked about this CV, in order. */
export function questionsFor(cv: CVDocument): CVQuestionId[] {
  return QUESTIONS.filter((question) => question.phase === "cv" && question.applies(cv)).map((question) => question.id as CVQuestionId);
}

/**
 * The question after `id`, or null when `id` is the last one (the template
 * chooser follows). Works from any question, including one that no longer
 * applies to this CV, so a changed answer never strands the person.
 */
export function nextQuestion(cv: CVDocument, id: QuestionId): CVQuestionId | null {
  const at = orderOf(id);
  return questionsFor(cv).find((candidate) => orderOf(candidate) > at) ?? null;
}

/**
 * The question before `id`, or null for the very first. The opening collapses
 * to its first question: whether "source" was visited is not part of the CV.
 */
export function previousQuestion(cv: CVDocument, id: QuestionId): QuestionId | null {
  if (id === "start") return null;
  const at = orderOf(id);
  const before = questionsFor(cv).filter((candidate) => orderOf(candidate) < at);
  return before[before.length - 1] ?? "start";
}

/** Where to pick the conversation back up: the first question without an answer, else the last one. */
export function resumeQuestion(cv: CVDocument): CVQuestionId {
  const questions = questionsFor(cv);
  return questions.find((id) => !getQuestion(id).answered(cv)) ?? questions[questions.length - 1]!;
}

export function isAnswered(cv: CVDocument, id: QuestionId): boolean {
  return getQuestion(id).answered(cv);
}

/** What the primary button does: an optional question with nothing in it is skipped, anything else goes on. */
export function primaryAction(cv: CVDocument, id: QuestionId): "next" | "skip" {
  const question = getQuestion(id);
  return !question.required && !question.answered(cv) ? "skip" : "next";
}

const ALL_CV_QUESTIONS = QUESTIONS.filter((question) => question.phase === "cv").map((question) => question.id as CVQuestionId);

/**
 * How far along the conversation `id` is, strictly between 0 and 1 (the
 * template chooser is the far end). Pass null before the CV exists.
 */
export function progress(cv: CVDocument | null, id: QuestionId): number {
  const sequence: QuestionId[] = ["start", "source", ...(cv ? questionsFor(cv) : ALL_CV_QUESTIONS)];
  const at = orderOf(id);
  const reached = sequence.filter((candidate) => orderOf(candidate) <= at).length;
  return Math.max(1, reached) / (sequence.length + 1);
}
