import { splitSkillList } from "../normalize";

export type ClassifiedSection = "education" | "experiences" | "skills" | "projects" | "summary" | "unknown";

const KEYWORDS: Record<Exclude<ClassifiedSection, "unknown">, RegExp[]> = {
  education: [
    /\b(studied|study|graduated?|university|college|school|institute|bachelor|master|ph\.?d|degree|diploma|gpa|major(ed)?)\b/i,
    /សាកលវិទ្យាល័យ|វិទ្យាស្ថាន|សាលា|បរិញ្ញាបត្រ|អនុបណ្ឌិត|បណ្ឌិត|សិក្សា|បញ្ចប់ការសិក្សា|វិទ្យាល័យ/,
  ],
  experiences: [
    /\b(work(ed|ing)?( at| for| as)?|job|intern(ship)?|employ(ed|ee)|company|manager|developer|engineer|officer|assistant|position|staff|responsib)/i,
    /ធ្វើការ|ការងារ|ក្រុមហ៊ុន|បុគ្គលិក|កម្មសិក្សា|មុខតំណែង|ប្រធាន|ជំនួយការ/,
  ],
  skills: [
    /\b(skills?|proficient|familiar with|good at|know(ledge)?( of)?|experienced (in|with))\b/i,
    /ជំនាញ|ចេះ|ស្ទាត់ជំនាញ/,
  ],
  projects: [
    /\b(project|built|created|developed an?|app(lication)?|website|system|prototype|thesis|capstone)\b/i,
    /គម្រោង|បង្កើត|កម្មវិធី|គេហទំព័រ|ប្រព័ន្ធ/,
  ],
  summary: [
    /\b(i am an?|i'm an?|passionate|motivated|looking for|seeking|my goal|career objective)\b/i,
    /ខ្ញុំជា|គោលបំណង|ស្វែងរក|ចង់បាន/,
  ],
};

export interface Classification {
  section: ClassifiedSection;
  /** Share of matched signals that point at `section` (0–1). A heuristic, not a probability. */
  confidence: number;
  scores: Record<string, number>;
}

/**
 * Rule-based first pass: decide which CV section a piece of free text belongs
 * to. Runs before (and without) any LLM.
 */
export function classifyText(text: string): Classification {
  const scores: Record<string, number> = {};
  let total = 0;
  for (const [section, patterns] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const pattern of patterns) {
      const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      score += (text.match(global) ?? []).length;
    }
    scores[section] = score;
    total += score;
  }
  // A short comma-separated list with no verbs is almost always a skills list.
  const parts = splitSkillList(text);
  if (parts.length >= 3 && parts.every((p) => p.split(/\s+/).length <= 3)) {
    scores.skills = (scores.skills ?? 0) + 3;
    total += 3;
  }
  if (total === 0) return { section: "unknown", confidence: 0, scores };
  const [best, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]!;
  return { section: best as ClassifiedSection, confidence: bestScore / total, scores };
}

/** Years mentioned in the text, in order of appearance (Khmer digits supported). */
export function extractYears(text: string): string[] {
  const normalized = text.replace(/[០-៩]/g, (d) => String("០១២៣៤៥៦៧៨៩".indexOf(d)));
  return [...normalized.matchAll(/\b(19[5-9]\d|20\d{2})\b/g)].map((m) => m[1]!);
}
