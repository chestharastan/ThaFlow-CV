import type { CVDocument } from "@thaflow/cv-core";
import type { QuestionId } from "./questions";

/** Something that stops a question from being left. The interface turns the code into one line of text. */
export interface Issue {
  /** The box the problem is in. */
  field: string;
  code: "required" | "invalid-email" | "date-order";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Empty is fine (the email is optional); anything typed must look like an address. */
export function isValidEmail(value: string | undefined): boolean {
  const text = value?.trim();
  return !text || EMAIL.test(text);
}

/**
 * What stops this question from being left, if anything. Only two things can:
 * a missing name, and an email address that is not one.
 */
export function validateQuestion(cv: CVDocument, id: QuestionId): Issue[] {
  switch (id) {
    case "name":
      return cv.personal.fullName.trim() ? [] : [{ field: "fullName", code: "required" }];
    case "contact":
      return isValidEmail(cv.personal.email) ? [] : [{ field: "email", code: "invalid-email" }];
    default:
      return [];
  }
}

export function canLeave(cv: CVDocument, id: QuestionId): boolean {
  return validateQuestion(cv, id).length === 0;
}
