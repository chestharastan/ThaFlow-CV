import type { Line } from "./lines";

/* Section headings, in English and Khmer. */

export type Section = "summary" | "experiences" | "education" | "skills" | "projects" | "certifications" | "languages" | "awards" | "contact" | "other";

const HEADINGS: Record<Section, string[]> = {
  summary: ["summary", "profile", "professional summary", "professional profile", "personal profile", "about me", "about", "objective", "career objective", "personal statement", "career summary", "profile summary", "executive summary", "career profile", "who i am", "សេចក្តីសង្ខេប", "សេចក្ដីសង្ខេប", "គោលបំណង", "គោលបំណងការងារ", "អំពីខ្ញុំ", "ប្រវត្តិរូបសង្ខេប"],
  experiences: ["experience", "work experience", "professional experience", "employment history", "employment", "work history", "career history", "working experience", "experiences", "work experiences", "relevant experience", "internships", "internship experience", "work experience and leadership", "experience and leadership", "leadership and experience", "leadership experience", "leadership and activities", "teaching experience", "research experience", "volunteer experience", "volunteer work", "extracurricular activities", "បទពិសោធន៍ការងារ", "បទពិសោធន៍", "ប្រវត្តិការងារ", "បទពិសោធន៍វិជ្ជាជីវៈ"],
  education: ["education", "academic background", "education and training", "academic history", "educational background", "qualifications", "academic qualifications", "education background", "ការសិក្សា", "ប្រវត្តិការសិក្សា", "កម្រិតវប្បធម៌", "ប្រវត្តិសិក្សា"],
  skills: ["skills", "technical skills", "core competencies", "key skills", "competencies", "expertise", "skills and expertise", "professional skills", "areas of expertise", "hard skills", "soft skills", "tech stack", "technical expertise", "technical proficiency", "tools and technologies", "software skills", "computer skills", "it skills", "digital skills", "personal skills", "skills and tools", "skills summary", "top skills", "ជំនាញ", "ជំនាញផ្សេងៗ", "សមត្ថភាព", "ជំនាញបច្ចេកទេស"],
  projects: ["projects", "personal projects", "key projects", "selected projects", "academic projects", "projects and research", "research and projects", "research projects", "thesis and projects", "notable projects", "featured projects", "side projects", "គម្រោង", "គម្រោងផ្សេងៗ"],
  certifications: ["certifications", "certificates", "licenses", "licences", "licenses and certifications", "certifications and training", "training", "courses", "training and certifications", "courses and certifications", "certifications and courses", "professional development", "relevant coursework", "វិញ្ញាបនបត្រ", "វគ្គបណ្តុះបណ្តាល", "វគ្គបណ្ដុះបណ្ដាល", "ការបណ្តុះបណ្តាល"],
  languages: ["languages", "language skills", "language", "language proficiency", "spoken languages", "languages spoken", "ភាសា", "ភាសាបរទេស", "ចំណេះដឹងភាសា"],
  awards: ["awards", "honors", "honours", "achievements", "awards and honors", "honors and awards", "awards and achievements", "honors and achievements", "achievements and awards", "scholarships", "awards and scholarships", "រង្វាន់", "សមិទ្ធផល"],
  contact: ["contact", "contact details", "contact information", "personal information", "personal details", "personal data", "details", "contact me", "contact info", "get in touch", "reach me", "personal info", "about me and contact", "find me online", "ទំនាក់ទំនង", "ព័ត៌មានផ្ទាល់ខ្លួន", "ព័ត៌មានទំនាក់ទំនង"],
  other: ["references", "referees", "reference", "hobbies", "interests", "hobbies and interests", "additional", "additional information", "publications", "អ្នកធានា", "ឯកសារយោង", "ចំណូលចិត្ត", "ព័ត៌មានបន្ថែម", "សកម្មភាពសង្គម"],
};
/**
 * Names that are also ordinary words ("Tools", "Leadership", "Work"). On their own line they may be a
 * section title or just a label inside another section, so they count only when the line is set the way
 * the document sets its section titles.
 */
const WEAK_HEADINGS: Partial<Record<Section, string[]>> = {
  experiences: ["leadership", "activities", "work", "internship", "extracurricular", "organizations", "organisations", "volunteering"],
  skills: ["software", "programming", "tools", "technologies", "skill", "strengths", "programming languages"],
  projects: ["project", "portfolio", "thesis"],
  education: ["academic", "academics", "studies"],
  summary: ["bio", "introduction"],
  certifications: ["certificate", "certification", "coursework", "workshops", "trainings"],
  awards: ["award", "recognition", "accomplishments"],
  contact: ["info", "links", "social", "socials", "contacts"],
};
const WEAK_LOOKUP = new Map<string, Section>();
for (const [section, names] of Object.entries(WEAK_HEADINGS) as [Section, string[]][]) for (const name of names) WEAK_LOOKUP.set(name, section);

const HEADING_LOOKUP = new Map<string, Section>();
/** The same names with their spaces removed: letter-spaced headings can lose the gaps between words. */
const PACKED_LOOKUP = new Map<string, Section>();
for (const [section, names] of Object.entries(HEADINGS) as [Section, string[]][]) {
  for (const name of names) {
    HEADING_LOOKUP.set(name, section);
    if (name.includes(" ")) PACKED_LOOKUP.set(name.replace(/ /g, ""), section);
  }
}

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
  if (text.length > 48) return null;
  const name = normalizeHeading(text);
  const direct = HEADING_LOOKUP.get(name);
  if (direct) return direct;
  // Letter-spaced capitals come out of a PDF with their spaces lost ("WORKEXPERIENCE") or in the wrong
  // places ("PROJ EC TS"). Only capitals are forgiven this: ordinary words keep their spelling.
  const packed = name.replace(/ /g, "");
  const capitals = /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);
  if (capitals || !name.includes(" ")) return PACKED_LOOKUP.get(packed) ?? (capitals ? (HEADING_LOOKUP.get(packed) ?? null) : null);
  return null;
}

/** The section a word names when it is used as a title (see WEAK_HEADINGS). */
export function weakHeading(text: string): Section | null {
  return text.length > 32 ? null : (WEAK_LOOKUP.get(normalizeHeading(text)) ?? null);
}

/** A line is a heading only if the whole line is a known heading: a sentence that mentions "experience" is not. */
export function headingOf(line: Line): Section | null {
  if (line.right || line.bullet) return null;
  return knownHeading(line.text) ?? (line.heading && line.text.length <= 48 ? "other" : null);
}
