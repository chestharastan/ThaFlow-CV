import { msg, type Rule } from "../core/types";
import { findDuplicateSkills } from "../normalize";

export const experienceIdentityRule: Rule = {
  id: "EXP-001",
  description: "Each experience needs a job title and an organization.",
  category: "experience",
  severity: "error",
  evaluate: (ctx) => {
    const out = [];
    for (const exp of ctx.cv.experiences) {
      if (!exp.position.trim()) {
        out.push({
          message: msg(ctx, { en: "Add a job title for this experience.", km: "សូមបញ្ចូលមុខតំណែងសម្រាប់បទពិសោធន៍នេះ។" }),
          field: `experiences.${exp.id}.position`,
          section: "experiences" as const,
        });
      }
      if (!exp.company.trim()) {
        out.push({
          message: msg(ctx, {
            en: `Add the company or organization${exp.position ? ` for "${exp.position}"` : ""}.`,
            km: "សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន ឬអង្គភាព។",
          }),
          field: `experiences.${exp.id}.company`,
          section: "experiences" as const,
        });
      }
    }
    return out;
  },
};

export const experienceCurrentRule: Rule = {
  id: "EXP-002",
  description: "A current position should not also have an end date.",
  category: "consistency",
  severity: "warning",
  evaluate: (ctx) =>
    ctx.cv.experiences
      .filter((exp) => exp.isCurrent && exp.endDate)
      .map((exp) => ({
        message: msg(ctx, {
          en: `"${exp.position || exp.company}" is marked as current but has an end date.`,
          km: `"${exp.position || exp.company}" ត្រូវបានសម្គាល់ថាជាការងារបច្ចុប្បន្ន ប៉ុន្តែមានកាលបរិច្ឆេទបញ្ចប់។`,
        }),
        field: `experiences.${exp.id}.endDate`,
        section: "experiences" as const,
        suggestion: msg(ctx, { en: "Remove the end date.", km: "លុបកាលបរិច្ឆេទបញ្ចប់ចេញ។" }),
      })),
};

export const experienceDetailRule: Rule = {
  id: "EXP-003",
  description: "Experiences should describe what the person did.",
  category: "content",
  severity: "info",
  evaluate: (ctx) =>
    ctx.cv.experiences
      .filter((exp) => !exp.description.trim() && exp.achievements.every((a) => !a.trim()))
      .map((exp) => ({
        message: msg(ctx, {
          en: `Describe what you did as "${exp.position || exp.company || "this role"}".`,
          km: `សូមពិពណ៌នាអំពីអ្វីដែលអ្នកបានធ្វើក្នុងតួនាទី "${exp.position || exp.company || "នេះ"}"។`,
        }),
        field: `experiences.${exp.id}.description`,
        section: "experiences" as const,
      })),
};

export const experienceStartDateRule: Rule = {
  id: "EXP-004",
  description: "Experiences should have a start date.",
  category: "experience",
  severity: "warning",
  evaluate: (ctx) =>
    ctx.cv.experiences
      .filter((exp) => !exp.startDate)
      .map((exp) => ({
        message: msg(ctx, {
          en: `Add a start date for "${exp.position || exp.company || "this experience"}".`,
          km: "សូមបញ្ចូលកាលបរិច្ឆេទចាប់ផ្តើម។",
        }),
        field: `experiences.${exp.id}.startDate`,
        section: "experiences" as const,
      })),
};

export const educationIdentityRule: Rule = {
  id: "EDU-001",
  description: "Each education entry needs an institution.",
  category: "education",
  severity: "error",
  evaluate: (ctx) =>
    ctx.cv.education
      .filter((edu) => !edu.institution.trim())
      .map((edu) => ({
        message: msg(ctx, { en: "Add the school or university name.", km: "សូមបញ្ចូលឈ្មោះសាលា ឬសាកលវិទ្យាល័យ។" }),
        field: `education.${edu.id}.institution`,
        section: "education" as const,
      })),
};

export const educationQualificationRule: Rule = {
  id: "EDU-002",
  description: "Education entries should identify the qualification.",
  category: "education",
  severity: "info",
  evaluate: (ctx) =>
    ctx.cv.education
      .filter((edu) => edu.institution.trim() && !edu.degree?.trim() && !edu.fieldOfStudy?.trim())
      .map((edu) => ({
        message: msg(ctx, {
          en: `Add your degree or field of study at ${edu.institution}.`,
          km: `សូមបញ្ចូលសញ្ញាបត្រ ឬជំនាញសិក្សារបស់អ្នកនៅ ${edu.institution}។`,
        }),
        field: `education.${edu.id}.degree`,
        section: "education" as const,
      })),
};

export const duplicateSkillsRule: Rule = {
  id: "SKL-001",
  description: "Skills should not be listed more than once.",
  category: "skills",
  severity: "warning",
  evaluate: (ctx) => {
    const dupes = findDuplicateSkills(ctx.cv.skills);
    if (dupes.length === 0) return [];
    return [
      {
        message: msg(ctx, {
          en: `Duplicated skills: ${dupes.join(", ")}.`,
          km: `ជំនាញស្ទួន៖ ${dupes.join(", ")}។`,
        }),
        section: "skills",
        suggestion: msg(ctx, { en: "Remove the duplicates.", km: "លុបជំនាញដែលស្ទួនចេញ។" }),
      },
    ];
  },
};

export const emptySkillGroupRule: Rule = {
  id: "SKL-002",
  description: "Skill groups should contain at least one skill.",
  category: "skills",
  severity: "info",
  evaluate: (ctx) =>
    ctx.cv.skills
      .filter((g) => g.skills.length === 0)
      .map((g) => ({
        message: msg(ctx, {
          en: `The skill group "${g.category || "Untitled"}" is empty.`,
          km: `ក្រុមជំនាញ "${g.category || "គ្មានចំណងជើង"}" នៅទទេ។`,
        }),
        section: "skills" as const,
      })),
};

export const substanceRule: Rule = {
  id: "CMP-001",
  description: "A CV needs at least one of experience, education or projects.",
  category: "completeness",
  severity: "warning",
  evaluate: (ctx) =>
    ctx.cv.experiences.length + ctx.cv.education.length + ctx.cv.projects.length > 0
      ? []
      : [
          {
            message: msg(ctx, {
              en: "Add at least one experience, education entry or project.",
              km: "សូមបញ្ចូលបទពិសោធន៍ ការសិក្សា ឬគម្រោងយ៉ាងហោចណាស់មួយ។",
            }),
            section: ctx.cv.metadata.target === "student" ? "education" : "experiences",
          },
        ],
};

export const sectionRules: Rule[] = [
  experienceIdentityRule,
  experienceCurrentRule,
  experienceDetailRule,
  experienceStartDateRule,
  educationIdentityRule,
  educationQualificationRule,
  duplicateSkillsRule,
  emptySkillGroupRule,
  substanceRule,
];
