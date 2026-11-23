import { describe, expect, it } from "vitest";
import { createEmptyCV, cvDocumentSchema, type CVDocument } from "@thaflow/cv-core";
import {
  QUESTION_IDS,
  answerOpening,
  blankEntry,
  canLeave,
  entriesOf,
  entryFor,
  isAnswered,
  isBlankEntry,
  isOpeningQuestion,
  isQuestionId,
  isValidEmail,
  joinPartialDate,
  levelLabel,
  levelOf,
  listSkills,
  nextQuestion,
  previousQuestion,
  primaryAction,
  progress,
  questionsFor,
  removeEntry,
  resumeQuestion,
  sectionScreen,
  setFullName,
  setLanguage,
  setSkills,
  setSpokenLanguages,
  setWorked,
  splitPartialDate,
  tidyAnswer,
  tidyEntry,
  toAsciiDigits,
  upsertEntry,
  validateEntry,
  validateQuestion,
  workedAnswer,
  type QuestionId,
} from "../src";

const newCV = () => createEmptyCV({ language: "en" });

/** A CV as it looks straight after a file was read: content present, "worked before" never asked. */
function importedCV(): CVDocument {
  const cv = newCV();
  cv.personal = { fullName: "Sok Dara", email: "dara@example.com", phone: "+855 12 345 678", location: "Phnom Penh" };
  cv.summary = "Sales assistant with two years of experience.";
  cv.experiences = [
    { id: "job1", position: "Sales Assistant", company: "Acme Co", startDate: "2022-03", endDate: "2024-01", isCurrent: false, description: "Served customers.", achievements: [], technologies: [] },
  ];
  cv.education = [{ id: "school1", institution: "Royal University of Phnom Penh", degree: "Bachelor", fieldOfStudy: "Business", endDate: "2021", achievements: [] }];
  cv.skills = [
    { id: "g1", category: "Office", skills: [{ id: "s1", name: "Excel", level: "Advanced" }, { id: "s2", name: "Word" }] },
    { id: "g2", category: "People", skills: [{ id: "s3", name: "Customer service" }] },
  ];
  cv.languages = [{ id: "l1", name: "Khmer", proficiency: "Native" }, { id: "l2", name: "English", proficiency: "B2" }];
  return cv;
}

const EVERY_CV_QUESTION = ["language", "name", "title", "contact", "work", "education", "projects", "skills", "languages", "about"];

/** Walk the conversation with Next from the first question about the CV. */
function walk(cv: CVDocument): QuestionId[] {
  const seen: QuestionId[] = [];
  let at: QuestionId | null = nextQuestion(cv, "start");
  while (at) {
    seen.push(at);
    at = nextQuestion(cv, at);
  }
  return seen;
}

describe("the opening", () => {
  it("asks about the file only when the person has a CV", () => {
    expect(answerOpening("start", "yes")).toEqual({ ask: "source" });
    expect(answerOpening("start", "no")).toEqual({ create: "blank" });
  });

  it("starts from the file when one is chosen", () => {
    expect(answerOpening("source", "file")).toEqual({ create: "import" });
  });

  it("treats having a CV but typing instead exactly like a new user", () => {
    expect(answerOpening("source", "type")).toEqual(answerOpening("start", "no"));
  });

  it("knows its own questions", () => {
    expect(QUESTION_IDS.filter(isOpeningQuestion)).toEqual(["start", "source"]);
    expect(isQuestionId("work")).toBe(true);
    expect(isQuestionId("personal")).toBe(false);
    expect(isQuestionId(null)).toBe(false);
  });
});

describe("a new user", () => {
  it("is asked every question, in order, starting with the language", () => {
    const cv = newCV();
    expect(questionsFor(cv)).toEqual(EVERY_CV_QUESTION);
    expect(walk(cv)).toEqual(EVERY_CV_QUESTION);
    expect(nextQuestion(cv, "source")).toBe("language");
  });

  it("resumes at the name, the first thing without an answer", () => {
    expect(resumeQuestion(newCV())).toBe("name");
  });

  it("ends after the last question", () => {
    expect(nextQuestion(newCV(), "about")).toBeNull();
  });

  it("can skip everything except the name", () => {
    const cv = newCV();
    expect(primaryAction(cv, "name")).toBe("next");
    for (const id of ["title", "contact", "education", "projects", "skills", "languages", "about"] as const) {
      expect(primaryAction(cv, id)).toBe("skip");
    }
    cv.personal.headline = "Accountant";
    cv.summary = "Careful with numbers.";
    expect(primaryAction(cv, "title")).toBe("next");
    expect(primaryAction(cv, "about")).toBe("next");
  });
});

describe("have you worked before?", () => {
  it("is unanswered on a new CV, and asked", () => {
    const cv = newCV();
    expect(workedAnswer(cv)).toBeNull();
    expect(sectionScreen(cv, "work")).toBe("ask");
    expect(isAnswered(cv, "work")).toBe(false);
  });

  it("not yet: remembered as a student CV, education leads, and projects are asked", () => {
    const cv = newCV();
    setWorked(cv, false);
    expect(cv.metadata.target).toBe("student");
    expect(workedAnswer(cv)).toBe("not-yet");
    expect(isAnswered(cv, "work")).toBe(true);
    expect(cv.appearance.sectionOrder.indexOf("education")).toBeLessThan(cv.appearance.sectionOrder.indexOf("experiences"));
    expect(nextQuestion(cv, "work")).toBe("education");
    expect(nextQuestion(cv, "education")).toBe("projects");
    expect(questionsFor(cv)).toContain("projects");
  });

  it("yes: remembered as a professional CV, experience leads, and projects are not asked", () => {
    const cv = newCV();
    setWorked(cv, true);
    expect(cv.metadata.target).toBe("professional");
    expect(workedAnswer(cv)).toBe("yes");
    expect(cv.appearance.sectionOrder.indexOf("experiences")).toBeLessThan(cv.appearance.sectionOrder.indexOf("education"));
    expect(questionsFor(cv)).not.toContain("projects");
    expect(nextQuestion(cv, "education")).toBe("skills");
    // Yes with no job added yet is still an open question.
    expect(isAnswered(cv, "work")).toBe(false);
    expect(resumeQuestion({ ...cv, personal: { fullName: "Dara", headline: "Clerk", email: "d@example.com" } })).toBe("work");
  });

  it("changing the answer changes the branch, and keeps a section order the person has not been given a reason to lose", () => {
    const cv = newCV();
    setWorked(cv, false);
    setWorked(cv, true);
    expect(questionsFor(cv)).not.toContain("projects");
    const custom = [...cv.appearance.sectionOrder].reverse();
    cv.appearance.sectionOrder = custom;
    setWorked(cv, true); // same answer again: nothing is reset
    expect(cv.appearance.sectionOrder).toEqual(custom);
  });

  it("still leads on from projects when a changed answer means they are no longer asked", () => {
    const cv = newCV();
    setWorked(cv, true);
    expect(nextQuestion(cv, "projects")).toBe("skills");
    expect(previousQuestion(cv, "projects")).toBe("education");
  });
});

describe("an imported CV", () => {
  it("goes straight to the list of jobs and never asks whether the person has worked", () => {
    const cv = importedCV();
    expect(cv.metadata.target).toBe("general");
    expect(workedAnswer(cv)).toBe("yes");
    expect(sectionScreen(cv, "work")).toBe("list");
    expect(sectionScreen(cv, "education")).toBe("list");
    expect(isAnswered(cv, "work")).toBe(true);
  });

  it("skips projects when the file had work experience and no projects", () => {
    expect(questionsFor(importedCV())).toEqual(EVERY_CV_QUESTION.filter((id) => id !== "projects"));
  });

  it("shows projects that were in the file so they can be confirmed", () => {
    const cv = importedCV();
    cv.projects = [{ id: "p1", name: "Stock app", description: "Tracked stock.", technologies: [] }];
    expect(questionsFor(cv)).toContain("projects");
    expect(sectionScreen(cv, "projects")).toBe("list");
  });

  it("offers Next, not Skip, on everything already filled in, and resumes at the first gap", () => {
    const cv = importedCV();
    for (const id of ["name", "contact", "work", "education", "skills", "languages", "about"] as const) {
      expect(primaryAction(cv, id)).toBe("next");
    }
    expect(primaryAction(cv, "title")).toBe("skip");
    expect(resumeQuestion(cv)).toBe("title");
    cv.personal.headline = "Sales Assistant";
    expect(resumeQuestion(cv)).toBe("about");
  });

  it("asks whether they have worked once every imported job has been removed", () => {
    const cv = importedCV();
    removeEntry(cv, "work", "job1");
    expect(sectionScreen(cv, "work")).toBe("ask");
    expect(workedAnswer(cv)).toBeNull();
  });
});

describe("next and previous", () => {
  const cases: [string, () => CVDocument][] = [
    ["new user", newCV],
    ["not yet", () => { const cv = newCV(); setWorked(cv, false); return cv; }],
    ["yes", () => { const cv = newCV(); setWorked(cv, true); return cv; }],
    ["imported", importedCV],
  ];

  it.each(cases)("are symmetric for %s", (_name, make) => {
    const cv = make();
    const order = walk(cv);
    expect(order).toEqual(questionsFor(cv));
    for (let i = 1; i < order.length; i++) {
      expect(previousQuestion(cv, order[i]!)).toBe(order[i - 1]);
      expect(nextQuestion(cv, order[i - 1]!)).toBe(order[i]);
    }
  });

  it("lead back into the opening and stop at its first question", () => {
    const cv = newCV();
    expect(previousQuestion(cv, "language")).toBe("start");
    expect(previousQuestion(cv, "source")).toBe("start");
    expect(previousQuestion(cv, "start")).toBeNull();
  });
});

describe("progress", () => {
  it.each([["new user", newCV], ["imported", importedCV]] as [string, () => CVDocument][])("only moves forward for %s, and stays inside the line", (_name, make) => {
    const cv = make();
    const order: QuestionId[] = ["start", "source", ...questionsFor(cv)];
    const values = order.map((id) => progress(cv, id));
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    expect(values[0]!).toBeGreaterThan(0);
    expect(values[values.length - 1]!).toBeLessThan(1);
  });

  it("works before the CV exists", () => {
    expect(progress(null, "start")).toBeGreaterThan(0);
    expect(progress(null, "source")).toBeGreaterThan(progress(null, "start"));
    expect(progress(null, "source")).toBeLessThan(progress(newCV(), "language"));
  });

  it("does not jump back when the person lands on a question that no longer applies", () => {
    const cv = newCV();
    setWorked(cv, true);
    expect(progress(cv, "projects")).toBe(progress(cv, "education"));
  });
});

describe("validation", () => {
  it("requires a name", () => {
    const cv = newCV();
    expect(validateQuestion(cv, "name")).toEqual([{ field: "fullName", code: "required" }]);
    cv.personal.fullName = "   ";
    expect(canLeave(cv, "name")).toBe(false);
    cv.personal.fullName = "សុខ ដារ៉ា";
    expect(canLeave(cv, "name")).toBe(true);
  });

  it("lets contact details stay empty but stops a wrong email", () => {
    const cv = newCV();
    expect(canLeave(cv, "contact")).toBe(true);
    cv.personal.phone = "012 345 678";
    expect(canLeave(cv, "contact")).toBe(true);
    for (const wrong of ["dara", "dara@", "dara@example", "dara @example.com", "@example.com", "dara@example.c"]) {
      cv.personal.email = wrong;
      expect(validateQuestion(cv, "contact")).toEqual([{ field: "email", code: "invalid-email" }]);
    }
    for (const right of ["dara@example.com", "  dara.sok+cv@mail.example.com.kh  ", ""]) {
      cv.personal.email = right;
      expect(canLeave(cv, "contact")).toBe(true);
    }
    expect(isValidEmail(undefined)).toBe(true);
  });

  it("never blocks the optional questions", () => {
    const cv = newCV();
    for (const id of ["language", "title", "work", "education", "projects", "skills", "languages", "about"] as const) {
      expect(canLeave(cv, id)).toBe(true);
    }
  });
});

describe("answers", () => {
  it("names the CV after the person until it has a title of its own", () => {
    const cv = newCV();
    setFullName(cv, "Sok Dara");
    expect(cv.metadata.title).toBe("Sok Dara");
    setFullName(cv, "Sok Dara Vichea");
    expect(cv.metadata.title).toBe("Sok Dara Vichea");
    cv.metadata.title = "CV for the bank";
    setFullName(cv, "Dara");
    expect(cv.metadata.title).toBe("CV for the bank");
    const cleared = newCV();
    setFullName(cleared, "Dara");
    setFullName(cleared, "");
    expect(cleared.metadata.title).toBe(newCV().metadata.title);
  });

  it("trims what was typed when a question is left", () => {
    const cv = newCV();
    setFullName(cv, "  Sok Dara ");
    cv.personal.headline = "  ";
    cv.personal.email = " dara@example.com ";
    cv.summary = "  Careful.\n";
    for (const id of ["name", "title", "contact", "about"] as const) tidyAnswer(cv, id);
    expect(cv.personal.fullName).toBe("Sok Dara");
    expect(cv.metadata.title).toBe("Sok Dara");
    expect(cv.personal.headline).toBeUndefined();
    expect(cv.personal.email).toBe("dara@example.com");
    expect(cv.summary).toBe("Careful.");
  });

  it("edits skills as one flat list without disturbing groups, ids or levels", () => {
    const cv = importedCV();
    expect(listSkills(cv)).toEqual(["Excel", "Word", "Customer service"]);
    setSkills(cv, ["Excel", "Customer service", "Driving", "driving", " "]);
    expect(listSkills(cv)).toEqual(["Excel", "Customer service", "Driving"]);
    expect(cv.skills.map((g) => g.category)).toEqual(["Office", "People"]);
    expect(cv.skills[0]!.skills).toEqual([{ id: "s1", name: "Excel", level: "Advanced" }]);
    expect(cv.skills[1]!.skills.map((s) => s.name)).toEqual(["Customer service", "Driving"]);
    setSkills(cv, ["Driving"]);
    expect(cv.skills).toHaveLength(1);
    setSkills(cv, []);
    expect(cv.skills).toEqual([]);
    expect(isAnswered(cv, "skills")).toBe(false);
  });

  it("starts a skill group for a new user", () => {
    const cv = newCV();
    setSkills(cv, ["Excel", "Teamwork"]);
    expect(cv.skills).toHaveLength(1);
    expect(listSkills(cv)).toEqual(["Excel", "Teamwork"]);
    expect(isAnswered(cv, "skills")).toBe(true);
  });

  it("keeps spoken languages that have a name", () => {
    const cv = newCV();
    setSpokenLanguages(cv, [
      { id: "a", name: "Khmer", proficiency: "Native" },
      { id: "b", name: "  ", proficiency: "Good" },
      { id: "c", name: "English", proficiency: "" },
    ]);
    expect(cv.languages).toEqual([
      { id: "a", name: "Khmer", proficiency: "Native" },
      { id: "c", name: "English", proficiency: undefined },
    ]);
    expect(isAnswered(cv, "languages")).toBe(true);
  });

  it("prints levels in the CV's language and follows it when it changes", () => {
    expect(levelOf("Fluent")).toBe("fluent");
    expect(levelOf(" native ")).toBe("native");
    expect(levelOf(levelLabel("basic", "km"))).toBe("basic");
    expect(levelOf("B2")).toBeNull();
    expect(levelOf(undefined)).toBeNull();
    const cv = importedCV();
    setLanguage(cv, "km");
    expect(cv.metadata.language).toBe("km");
    expect(cv.languages[0]!.proficiency).toBe(levelLabel("native", "km"));
    expect(cv.languages[1]!.proficiency).toBe("B2"); // not one of ours: kept as written
    setLanguage(cv, "en");
    expect(cv.languages[0]!.proficiency).toBe("Native");
  });

  it("leaves a document the schema accepts", () => {
    const cv = newCV();
    setLanguage(cv, "km");
    setFullName(cv, "សុខ ដារ៉ា");
    setWorked(cv, false);
    upsertEntry(cv, "education", { ...blankEntry("education", "e1"), institution: "RUPP", endDate: "2024" });
    upsertEntry(cv, "projects", { ...blankEntry("projects", "p1"), name: "Charity run" });
    setSkills(cv, ["Excel"]);
    setSpokenLanguages(cv, [{ id: "l1", name: "ខ្មែរ", proficiency: levelLabel("native", "km") }]);
    for (const id of QUESTION_IDS) tidyAnswer(cv, id);
    expect(cvDocumentSchema.safeParse(cv).success).toBe(true);
  });
});

describe("entries", () => {
  it("asks for the first school or project directly, and shows the list once there is one", () => {
    const cv = newCV();
    expect(sectionScreen(cv, "education")).toBe("entry");
    expect(sectionScreen(cv, "projects")).toBe("entry");
    upsertEntry(cv, "education", { ...blankEntry("education", "e1"), institution: "RUPP" });
    expect(sectionScreen(cv, "education")).toBe("list");
    expect(sectionScreen(cv, "education", "e1")).toBe("entry");
    expect(sectionScreen(cv, "education", "new-id")).toBe("entry");
  });

  it("stores an entry as soon as it has content, in place, oldest last, and never stores a blank one", () => {
    const cv = newCV();
    const blank = entryFor(cv, "work", "j1");
    expect(isBlankEntry("work", blank)).toBe(true);
    upsertEntry(cv, "work", blank);
    expect(cv.experiences).toEqual([]);

    upsertEntry(cv, "work", { ...blank, position: "Cashier" });
    upsertEntry(cv, "work", { ...blankEntry("work", "j2"), company: "Old Shop" });
    upsertEntry(cv, "work", { ...entryFor(cv, "work", "j1"), company: "Lucky Mart" });
    expect(cv.experiences.map((job) => [job.id, job.position, job.company])).toEqual([
      ["j1", "Cashier", "Lucky Mart"],
      ["j2", "", "Old Shop"],
    ]);
    expect(entriesOf(cv, "work")).toBe(cv.experiences);

    upsertEntry(cv, "work", { ...entryFor(cv, "work", "j1"), position: "", company: "  " });
    expect(cv.experiences.map((job) => job.id)).toEqual(["j2"]);
    removeEntry(cv, "work", "j2");
    removeEntry(cv, "work", "missing");
    expect(cv.experiences).toEqual([]);
  });

  it("counts a ticked 'still work here' or a date as content", () => {
    expect(isBlankEntry("work", { ...blankEntry("work", "j"), isCurrent: true })).toBe(false);
    expect(isBlankEntry("work", { ...blankEntry("work", "j"), startDate: "2022" })).toBe(false);
    expect(isBlankEntry("education", { ...blankEntry("education", "e"), endDate: "2021" })).toBe(false);
    expect(isBlankEntry("education", blankEntry("education", "e"))).toBe(true);
    expect(isBlankEntry("projects", blankEntry("projects", "p"))).toBe(true);
    expect(isBlankEntry("projects", { ...blankEntry("projects", "p"), description: "Built a thing" })).toBe(false);
  });

  it("needs something to call an entry by", () => {
    const job = blankEntry("work", "j");
    expect(validateEntry("work", { ...job, description: "Served customers" })).toEqual([{ field: "position", code: "required" }]);
    expect(validateEntry("work", { ...job, company: "Lucky Mart" })).toEqual([]);
    expect(validateEntry("work", { ...job, position: "Cashier" })).toEqual([]);
    const school = blankEntry("education", "e");
    expect(validateEntry("education", { ...school, endDate: "2021" })).toEqual([{ field: "institution", code: "required" }]);
    expect(validateEntry("education", { ...school, degree: "High school diploma" })).toEqual([]);
    const project = blankEntry("projects", "p");
    expect(validateEntry("projects", { ...project, description: "A run" })).toEqual([{ field: "name", code: "required" }]);
    expect(validateEntry("projects", { ...project, name: "Charity run" })).toEqual([]);
  });

  it("does not let an entry end before it starts", () => {
    const job = { ...blankEntry("work", "j"), position: "Cashier", startDate: "2023-05" };
    expect(validateEntry("work", { ...job, endDate: "2022" })).toEqual([{ field: "endDate", code: "date-order" }]);
    expect(validateEntry("work", { ...job, endDate: "2023" })).toEqual([]); // a bare year covers the whole year
    expect(validateEntry("work", { ...job, endDate: "2023-04" })).toEqual([{ field: "endDate", code: "date-order" }]);
    expect(validateEntry("work", { ...job, endDate: "2022", isCurrent: true })).toEqual([]);
    const school = { ...blankEntry("education", "e"), institution: "RUPP", startDate: "2021", endDate: "2019" };
    expect(validateEntry("education", school)).toEqual([{ field: "endDate", code: "date-order" }]);
  });

  it("trims an entry without touching anything else in it", () => {
    const job = { ...blankEntry("work", "j"), position: " Cashier ", company: "Lucky Mart  ", description: "\nServed customers. ", achievements: ["Employee of the month"] };
    expect(tidyEntry("work", job)).toEqual({ ...job, position: "Cashier", company: "Lucky Mart", description: "Served customers." });
    expect(tidyEntry("education", { ...blankEntry("education", "e"), institution: " RUPP ", degree: " ", fieldOfStudy: " IT " })).toMatchObject({ institution: "RUPP", degree: undefined, fieldOfStudy: "IT" });
    expect(tidyEntry("projects", { ...blankEntry("projects", "p"), name: " Run " })).toMatchObject({ name: "Run" });
  });
});

describe("dates", () => {
  it("splits a stored date into month and year", () => {
    expect(splitPartialDate("2022-03")).toEqual({ month: "03", year: "2022" });
    expect(splitPartialDate("2021")).toEqual({ month: "", year: "2021" });
    expect(splitPartialDate("")).toEqual({ month: "", year: "" });
    expect(splitPartialDate(undefined)).toEqual({ month: "", year: "" });
    expect(splitPartialDate("March 2022")).toEqual({ month: "", year: "" });
  });

  it("stores a year alone or with its month", () => {
    expect(joinPartialDate({ month: "", year: "2021" })).toEqual({ value: "2021", valid: true });
    expect(joinPartialDate({ month: "03", year: " 2022 " })).toEqual({ value: "2022-03", valid: true });
    expect(joinPartialDate({ month: "", year: "" })).toEqual({ value: "", valid: true });
  });

  it("understands a year typed in Khmer numerals", () => {
    expect(toAsciiDigits("២០២៤")).toBe("2024");
    expect(joinPartialDate({ month: "12", year: "២០២៤" })).toEqual({ value: "2024-12", valid: true });
  });

  it("stores nothing, and says so, for a year that is not one or a month on its own", () => {
    for (const year of ["20", "202", "20222", "abcd", "1850", "2500"]) {
      expect(joinPartialDate({ month: "", year })).toEqual({ value: "", valid: false });
    }
    expect(joinPartialDate({ month: "03", year: "" })).toEqual({ value: "", valid: false });
    expect(joinPartialDate({ month: "13", year: "2022" })).toEqual({ value: "2022", valid: true });
  });
});
