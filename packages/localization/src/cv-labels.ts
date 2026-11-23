import type { CVLanguage, SectionKey } from "@thaflow/cv-core";

/** Labels printed inside the CV itself. They follow the CV's language, not the UI language. */
export interface CVLabels {
  sections: Record<SectionKey, string>;
  contact: string;
  present: string;
  technologies: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

const labels: Record<CVLanguage, CVLabels> = {
  en: {
    sections: {
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
    email: "Email",
    phone: "Phone",
    dateOfBirth: "Date of birth",
  },
  km: {
    sections: {
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
    email: "អ៊ីមែល",
    phone: "ទូរស័ព្ទ",
    dateOfBirth: "ថ្ងៃខែឆ្នាំកំណើត",
  },
};

export function getCVLabels(language: CVLanguage): CVLabels {
  return labels[language];
}
