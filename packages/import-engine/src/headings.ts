import type { Line } from "./lines";

/* Section headings, in English and Khmer. */

export type Section = "summary" | "experiences" | "education" | "skills" | "projects" | "certifications" | "languages" | "awards" | "contact" | "other";

const HEADINGS: Record<Section, string[]> = {
  summary: ["summary", "profile", "professional summary", "professional profile", "personal profile", "about me", "about", "objective", "career objective", "personal statement", "career summary", "សេចក្តីសង្ខេប", "សេចក្ដីសង្ខេប", "គោលបំណង", "គោលបំណងការងារ", "អំពីខ្ញុំ", "ប្រវត្តិរូបសង្ខេប"],
  experiences: ["experience", "work experience", "professional experience", "employment history", "employment", "work history", "career history", "working experience", "បទពិសោធន៍ការងារ", "បទពិសោធន៍", "ប្រវត្តិការងារ", "បទពិសោធន៍វិជ្ជាជីវៈ"],
  education: ["education", "academic background", "education and training", "academic history", "educational background", "qualifications", "academic qualifications", "ការសិក្សា", "ប្រវត្តិការសិក្សា", "កម្រិតវប្បធម៌", "ប្រវត្តិសិក្សា"],
  skills: ["skills", "technical skills", "core competencies", "key skills", "competencies", "expertise", "skills and expertise", "professional skills", "areas of expertise", "ជំនាញ", "ជំនាញផ្សេងៗ", "សមត្ថភាព", "ជំនាញបច្ចេកទេស"],
  projects: ["projects", "personal projects", "key projects", "selected projects", "academic projects", "គម្រោង", "គម្រោងផ្សេងៗ"],
  certifications: ["certifications", "certificates", "licenses", "licences", "licenses and certifications", "certifications and training", "training", "courses", "training and certifications", "វិញ្ញាបនបត្រ", "វគ្គបណ្តុះបណ្តាល", "វគ្គបណ្ដុះបណ្ដាល", "ការបណ្តុះបណ្តាល"],
  languages: ["languages", "language skills", "language", "language proficiency", "ភាសា", "ភាសាបរទេស", "ចំណេះដឹងភាសា"],
  awards: ["awards", "honors", "honours", "achievements", "awards and honors", "honors and awards", "awards and achievements", "រង្វាន់", "សមិទ្ធផល"],
  contact: ["contact", "contact details", "contact information", "personal information", "personal details", "personal data", "details", "ទំនាក់ទំនង", "ព័ត៌មានផ្ទាល់ខ្លួន", "ព័ត៌មានទំនាក់ទំនង"],
  other: ["references", "referees", "reference", "hobbies", "interests", "hobbies and interests", "additional", "additional information", "volunteering", "volunteer experience", "publications", "activities", "extracurricular activities", "អ្នកធានា", "ឯកសារយោង", "ចំណូលចិត្ត", "ព័ត៌មានបន្ថែម", "សកម្មភាពសង្គម"],
};
const HEADING_LOOKUP = new Map<string, Section>();
for (const [section, names] of Object.entries(HEADINGS) as [Section, string[]][]) for (const name of names) HEADING_LOOKUP.set(name, section);

function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\s*\d{1,2}\s*[.)]?\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[:：៖]\s*$/, "")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The section a piece of text names, if the whole text is a known section heading. */
export function knownHeading(text: string): Section | null {
  return text.length > 48 ? null : (HEADING_LOOKUP.get(normalizeHeading(text)) ?? null);
}

/** A line is a heading only if the whole line is a known heading: a sentence that mentions "experience" is not. */
export function headingOf(line: Line): Section | null {
  if (line.right || line.bullet) return null;
  return knownHeading(line.text) ?? (line.heading && line.text.length <= 48 ? "other" : null);
}
