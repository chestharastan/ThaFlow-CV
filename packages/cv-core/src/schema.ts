import { z } from "zod";

/**
 * The CV JSON schema is the single source of truth: the questionnaire writes
 * to it, rules validate it, AI suggests changes to it, templates render it and
 * exporters read it.
 */
export const CV_SCHEMA_VERSION = 2;

export const cvLanguageSchema = z.enum(["en", "km"]);
export type CVLanguage = z.infer<typeof cvLanguageSchema>;

export const cvTargetSchema = z.enum(["student", "professional", "academic", "general"]);
export type CVTarget = z.infer<typeof cvTargetSchema>;

/** Partial dates: "YYYY" or "YYYY-MM". Empty string means "not provided". */
export const partialDateSchema = z.string().default("");

const str = z.string().default("");
const optStr = z.string().optional();
const strList = z.array(z.string()).default([]);

export const personalSchema = z.object({
  fullName: str,
  headline: optStr,
  email: optStr,
  phone: optStr,
  location: optStr,
  website: optStr,
  linkedin: optStr,
  github: optStr,
  /** Data URL. Kept local; only rendered by templates that support photos. */
  photo: optStr,
  /*
   * Personal details. All optional, typed by the person, and printed as their
   * own section ("personalDetails"): CVs in Cambodia usually carry them.
   */
  /** "male", "female", or the person's own wording. */
  gender: optStr,
  /** "YYYY-MM-DD" (a partial date or free text is kept as written). */
  dateOfBirth: optStr,
  placeOfBirth: optStr,
  nationality: optStr,
  /** "single", "married", or the person's own wording. */
  maritalStatus: optStr,
  height: optStr,
  health: optStr,
});
export type PersonalInformation = z.infer<typeof personalSchema>;

/** The personal details, in the order they are printed. */
export const PERSONAL_DETAIL_KEYS = ["gender", "dateOfBirth", "placeOfBirth", "nationality", "maritalStatus", "height", "health"] as const;
export type PersonalDetailKey = (typeof PERSONAL_DETAIL_KEYS)[number];

/** Answers that are stored as a code and printed in the CV's language. Anything else is printed as written. */
export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
export const MARITAL_STATUSES = ["single", "married"] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export function hasPersonalDetails(personal: PersonalInformation): boolean {
  return PERSONAL_DETAIL_KEYS.some((key) => Boolean(personal[key]?.trim()));
}

export const employmentTypeSchema = z.enum([
  "full-time",
  "part-time",
  "contract",
  "internship",
  "freelance",
]);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const experienceSchema = z.object({
  id: z.string(),
  company: str,
  position: str,
  location: optStr,
  employmentType: employmentTypeSchema.optional(),
  startDate: optStr,
  endDate: optStr,
  isCurrent: z.boolean().default(false),
  description: str,
  achievements: strList,
  technologies: strList,
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  id: z.string(),
  institution: str,
  degree: optStr,
  fieldOfStudy: optStr,
  location: optStr,
  startDate: optStr,
  endDate: optStr,
  description: optStr,
  achievements: strList,
});
export type Education = z.infer<typeof educationSchema>;

export const skillSchema = z.object({
  id: z.string(),
  name: str,
  level: optStr,
});
export type Skill = z.infer<typeof skillSchema>;

export const skillGroupSchema = z.object({
  id: z.string(),
  category: str,
  skills: z.array(skillSchema).default([]),
});
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: str,
  description: str,
  technologies: strList,
  role: optStr,
  url: optStr,
  startDate: optStr,
  endDate: optStr,
});
export type Project = z.infer<typeof projectSchema>;

export const certificationSchema = z.object({
  id: z.string(),
  name: str,
  issuer: optStr,
  date: optStr,
  url: optStr,
});
export type Certification = z.infer<typeof certificationSchema>;

export const languageSkillSchema = z.object({
  id: z.string(),
  name: str,
  proficiency: optStr,
});
export type LanguageSkill = z.infer<typeof languageSkillSchema>;

export const awardSchema = z.object({
  id: z.string(),
  title: str,
  issuer: optStr,
  date: optStr,
  description: optStr,
});
export type Award = z.infer<typeof awardSchema>;

export const referenceSchema = z.object({
  id: z.string(),
  name: str,
  position: optStr,
  company: optStr,
  email: optStr,
  phone: optStr,
});
export type Reference = z.infer<typeof referenceSchema>;

export const customSectionSchema = z.object({
  id: z.string(),
  title: str,
  items: z
    .array(
      z.object({
        id: z.string(),
        title: str,
        subtitle: optStr,
        date: optStr,
        description: optStr,
      }),
    )
    .default([]),
});
export type CustomSection = z.infer<typeof customSectionSchema>;

export const SECTION_KEYS = [
  "personalDetails",
  "summary",
  "experiences",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "awards",
  "references",
  "customSections",
] as const;
export const sectionKeySchema = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof sectionKeySchema>;

export const appearanceSchema = z.object({
  templateId: z.string().default("minimal"),
  /** Empty string = use the template's own primary color. */
  primaryColor: z.string().default(""),
  /** Empty string = use the template's own font. */
  fontFamily: z.string().default(""),
  sectionOrder: z.array(sectionKeySchema).default([...SECTION_KEYS]),
  hiddenSections: z.array(sectionKeySchema).default([]),
});
export type Appearance = z.infer<typeof appearanceSchema>;

export const cvDocumentSchema = z.object({
  id: z.string(),
  metadata: z.object({
    title: z.string().default("Untitled CV"),
    version: z.number().int().default(CV_SCHEMA_VERSION),
    language: cvLanguageSchema.default("en"),
    target: cvTargetSchema.default("general"),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  personal: personalSchema,
  summary: str,
  experiences: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  projects: z.array(projectSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  languages: z.array(languageSkillSchema).default([]),
  awards: z.array(awardSchema).default([]),
  references: z.array(referenceSchema).default([]),
  customSections: z.array(customSectionSchema).default([]),
  appearance: appearanceSchema,
});
export type CVDocument = z.infer<typeof cvDocumentSchema>;

/* ---------- Local-only companion records ---------- */

export const suggestionStatusSchema = z.enum(["pending", "accepted", "rejected", "edited"]);

/**
 * Links the user's original text to an AI/rule suggestion so the user can
 * compare, reject, or restore their own writing. Nothing is applied to the CV
 * until the user accepts.
 */
export const contentSuggestionSchema = z.object({
  id: z.string(),
  cvId: z.string(),
  targetSection: z.string(),
  /** Dot path inside the CV, e.g. "summary" or "experiences.<id>.description". */
  targetField: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  provider: z.enum(["local", "cloud"]),
  status: suggestionStatusSchema,
  /** Integrity warnings attached by the rule engine (e.g. invented numbers). */
  warnings: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type ContentSuggestion = z.infer<typeof contentSuggestionSchema>;

export interface CVRevision {
  id: string;
  cvId: string;
  createdAt: string;
  label?: string;
  snapshot: CVDocument;
}

export const aiPreferencesSchema = z.object({
  /** "off": rules + manual only. Cloud is never used unless mode is "cloud" AND consent is given. */
  mode: z.enum(["off", "local", "cloud"]).default("off"),
  cloudEndpoint: z.string().default(""),
  cloudConsent: z.boolean().default(false),
});
export type AIPreferences = z.infer<typeof aiPreferencesSchema>;

export const appSettingsSchema = z.object({
  id: z.literal("app"),
  uiLanguage: cvLanguageSchema.default("en"),
  ai: aiPreferencesSchema.default({ mode: "off", cloudEndpoint: "", cloudConsent: false }),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  uiLanguage: "en",
  ai: { mode: "off", cloudEndpoint: "", cloudConsent: false },
};
