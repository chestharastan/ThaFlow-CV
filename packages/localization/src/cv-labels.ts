import type { CVLanguage, Gender, MaritalStatus, PersonalDetailKey, SectionKey } from "@thaflow/cv-core";

/** A detail printed as a labelled row: who the person is, how to reach them, and their personal details. */
export type FieldKey = "name" | "position" | "address" | "phone" | "email" | "website" | "linkedin" | "github" | PersonalDetailKey;

/** Labels printed inside the CV itself. They follow the CV's language, not the UI language. */
export interface CVLabels {
  sections: Record<SectionKey, string>;
  contact: string;
  present: string;
  technologies: string;
  /** Row labels, for templates that print details as "label : value". */
  fields: Record<FieldKey, string>;
  /** Words for the answers stored as codes. */
  gender: Record<Gender, string>;
  maritalStatus: Record<MaritalStatus, string>;
  /** The title some templates print at the top of the page. */
  documentTitle: string;
  /** The national motto that heads a formal Cambodian document: the state, then the motto. */
  nation: [string, string];
}

const labels: Record<CVLanguage, CVLabels> = {
  en: {
    sections: {
      personalDetails: "Personal details",
      summary: "Summary",
      experiences: "Experience",
      education: "Education",
      skills: "Skills",
      projects: "Projects",
      certifications: "Certifications",
      languages: "Languages",
      awards: "Awards",
      references: "References",
      customSections: "Additional",
    },
    contact: "Contact",
    present: "Present",
    technologies: "Technologies",
    fields: {
      name: "Name",
      position: "Position",
      address: "Address",
      phone: "Phone",
      email: "Email",
      website: "Website",
      linkedin: "LinkedIn",
      github: "GitHub",
      gender: "Gender",
      dateOfBirth: "Date of birth",
      placeOfBirth: "Place of birth",
      nationality: "Nationality",
      maritalStatus: "Marital status",
      height: "Height",
      health: "Health",
    },
    gender: { male: "Male", female: "Female" },
    maritalStatus: { single: "Single", married: "Married" },
    documentTitle: "Curriculum Vitae",
    nation: ["Kingdom of Cambodia", "Nation Religion King"],
  },
  km: {
    sections: {
      personalDetails: "ព័ត៌មានផ្ទាល់ខ្លួន",
      summary: "សេចក្តីសង្ខេប",
      experiences: "បទពិសោធន៍ការងារ",
      education: "ការសិក្សា",
      skills: "ជំនាញ",
      projects: "គម្រោង",
      certifications: "វិញ្ញាបនបត្រ",
      languages: "ភាសា",
      awards: "រង្វាន់",
      references: "អ្នកធានា",
      customSections: "ព័ត៌មានបន្ថែម",
    },
    contact: "ទំនាក់ទំនង",
    present: "បច្ចុប្បន្ន",
    technologies: "បច្ចេកវិទ្យា",
    fields: {
      name: "ឈ្មោះ",
      position: "មុខតំណែង",
      address: "អាសយដ្ឋាន",
      phone: "ទូរស័ព្ទ",
      email: "អ៊ីមែល",
      website: "គេហទំព័រ",
      linkedin: "LinkedIn",
      github: "GitHub",
      gender: "ភេទ",
      dateOfBirth: "ថ្ងៃខែឆ្នាំកំណើត",
      placeOfBirth: "ទីកន្លែងកំណើត",
      nationality: "សញ្ជាតិ",
      maritalStatus: "ស្ថានភាពគ្រួសារ",
      height: "កម្ពស់",
      health: "សុខភាព",
    },
    gender: { male: "ប្រុស", female: "ស្រី" },
    maritalStatus: { single: "នៅលីវ", married: "រៀបការ" },
    documentTitle: "ប្រវត្តិរូបសង្ខេប",
    nation: ["ព្រះរាជាណាចក្រកម្ពុជា", "ជាតិ សាសនា ព្រះមហាក្សត្រ"],
  },
};

export function getCVLabels(language: CVLanguage): CVLabels {
  return labels[language];
}
