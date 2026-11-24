import {
  CV_SCHEMA_VERSION,
  SECTION_KEYS,
  type CVDocument,
  type CVLanguage,
  type CVTarget,
  type Certification,
  type CustomSection,
  type Education,
  type Experience,
  type LanguageSkill,
  type Project,
  type Reference,
  type SectionKey,
  type SkillGroup,
  type Award,
} from "./schema";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Section order tuned for the CV's target audience. Personal details, when given, always come first. */
export function defaultSectionOrder(target: CVTarget): SectionKey[] {
  const lead: Record<CVTarget, SectionKey[]> = {
    student: ["summary", "education", "projects", "skills", "experiences"],
    academic: ["summary", "education", "experiences", "awards", "projects", "skills"],
    professional: ["summary", "experiences", "skills", "projects", "education"],
    general: ["summary", "experiences", "education", "skills", "projects"],
  };
  const first: SectionKey[] = ["personalDetails", ...lead[target]];
  return [...first, ...SECTION_KEYS.filter((k) => !first.includes(k))];
}

export interface CreateCVOptions {
  title?: string;
  language?: CVLanguage;
  target?: CVTarget;
  templateId?: string;
}

export function createEmptyCV(options: CreateCVOptions = {}): CVDocument {
  const now = new Date().toISOString();
  const target = options.target ?? "general";
  return {
    id: createId(),
    metadata: {
      title: options.title?.trim() || "Untitled CV",
      version: CV_SCHEMA_VERSION,
      language: options.language ?? "en",
      target,
      createdAt: now,
      updatedAt: now,
    },
    personal: { fullName: "" },
    summary: "",
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    references: [],
    customSections: [],
    appearance: {
      templateId: options.templateId ?? "minimal",
      primaryColor: "",
      fontFamily: "",
      sectionOrder: defaultSectionOrder(target),
      hiddenSections: [],
    },
  };
}

export const createExperience = (): Experience => ({
  id: createId(),
  company: "",
  position: "",
  isCurrent: false,
  description: "",
  achievements: [],
  technologies: [],
});

export const createEducation = (): Education => ({
  id: createId(),
  institution: "",
  achievements: [],
});

export const createSkillGroup = (category = ""): SkillGroup => ({
  id: createId(),
  category,
  skills: [],
});

export const createProject = (): Project => ({
  id: createId(),
  name: "",
  description: "",
  technologies: [],
});

export const createCertification = (): Certification => ({ id: createId(), name: "" });
export const createLanguageSkill = (): LanguageSkill => ({ id: createId(), name: "" });
export const createAward = (): Award => ({ id: createId(), title: "" });
export const createReference = (): Reference => ({ id: createId(), name: "" });
export const createCustomSection = (): CustomSection => ({ id: createId(), title: "", items: [] });
