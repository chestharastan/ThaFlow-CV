import {
  createAward,
  createCertification,
  createEducation,
  createExperience,
  createId,
  createLanguageSkill,
  createProject,
  type Education,
  type Experience,
  type LanguageSkill,
  type PersonalInformation,
  type SkillGroup,
} from "@thaflow/cv-core";
import { detectLanguage } from "@thaflow/rule-engine";
import { findDates, type FoundDates } from "./dates";
import { headingOf, knownHeading, type Section } from "./headings";
import { isBulletText, joinWrapped, stripBullet, tidy, type Line } from "./lines";
import type { ImportedCV } from "./types";

/* ---------- Small recognizers ---------- */

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const URL = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;]*)?/i;
const PHONE = /(?:\+|\(?\b0)[\d\s().-]{6,}\d|\b\d{3}[\s.-]\d{3}[\s.-]\d{3,4}\b/;
/** Personal data a modern CV should not carry; dropped on import. */
const PRIVATE = /^(date of birth|d\.?o\.?b\.?|birth ?date|born|place of birth|gender|sex|marital status|nationality|religion|id (card|number|no)|national id|passport|height|weight|health|age|ថ្ងៃខែឆ្នាំកំណើត|ថ្ងៃកំណើត|ទីកន្លែងកំណើត|ភេទ|សញ្ជាតិ|ស្ថានភាពគ្រួសារ|អត្តសញ្ញាណប័ណ្ណ|លេខអត្តសញ្ញាណប័ណ្ណ|សាសនា|កម្ពស់|ទម្ងន់|សុខភាព|អាយុ)\s*[:：៖-]/i;
const LABEL = /^(e-?mail|email address|phone|tel|telephone|mobile|cell|address|location|website|web|linkedin|github|អ៊ីមែល|ទូរស័ព្ទ|លេខទូរស័ព្ទ|អាសយដ្ឋាន|ទីតាំង|គេហទំព័រ)\s*[:：៖]\s*/i;
const SENTENCE_END = /[.។!?]$/;
const JOB_WORD = /\b(manager|developer|engineer|assistant|officer|analyst|accountant|intern|director|teacher|lecturer|designer|consultant|specialist|coordinator|lead|head|executive|supervisor|technician|clerk|cashier|driver|nurse|administrator|representative|associate|trainee|volunteer|founder|owner|chef|waiter|waitress|receptionist|secretary|tutor|researcher|editor|writer|architect|auditor|agent|advisor|operator|salesperson|sales)\b|ប្រធាន|អ្នកគ្រប់គ្រង|អ្នកអភិវឌ្ឍ|ជំនួយការ|មន្ត្រី|មន្រ្តី|គណនេយ្យករ|វិស្វករ|គ្រូ|បុគ្គលិក|អ្នកវិភាគ|អ្នកលក់|អ្នកបកប្រែ|កម្មសិក្សាការី|នាយក|អ្នករចនា|បេឡាករ|លេខា/i;
const SCHOOL_WORD = /\b(university|college|institute|school|academy|polytechnic|faculty)\b|សាកលវិទ្យាល័យ|វិទ្យាស្ថាន|សាលា|វិទ្យាល័យ|មហាវិទ្យាល័យ|សាលារៀន/i;
const DEGREE_WORD = /\b(bachelor|master|doctor|ph\.?d|b\.?sc|m\.?sc|b\.?a|m\.?a|mba|bba|b\.?eng|m\.?eng|diploma|associate|certificate|degree|high school|baccalaureate)\b|បរិញ្ញាបត្រ|បរិញ្ញាបត្រជាន់ខ្ពស់|អនុបណ្ឌិត|បណ្ឌិត|សញ្ញាបត្រ|បាក់ឌុប|មធ្យមសិក្សា/i;
const TECH_LABEL = /^(technologies|tools|tech stack|stack|tools and technologies|បច្ចេកវិទ្យា|ឧបករណ៍)\s*[:：៖]\s*/i;
const LEVEL_WORD = /^(native|mother tongue|fluent|proficient|advanced|upper[- ]intermediate|intermediate|pre[- ]intermediate|conversational|working proficiency|professional( working)? proficiency|good|very good|excellent|fair|basic|beginner|elementary|[abc][12]|ភាសាកំណើត|ស្ទាត់ជំនាញ|ស្ទាត់|ល្អ|ល្អណាស់|មធ្យម|មូលដ្ឋាន|កម្រិតមូលដ្ឋាន|កម្រិតមធ្យម|កម្រិតខ្ពស់|អាចប្រើការបាន)\b/i;
const COMPANY_TAIL = /^(ltd|inc|llc|co|plc|corp|limited|pte|gmbh)\.?$/i;

const splitTokens = (text: string) =>
  text
    .split(/\s*[|·•]\s*|\s+\/\s+|\s{2,}/)
    .map((t) => t.trim())
    .filter(Boolean);

const splitParts = (text: string) =>
  text
    .split(/\s*[|·•]\s*|\s+[—–-]\s+|\s{2,}|\s+(?:at|@)\s+|\s+នៅ\s+/)
    .map((t) => t.replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, "").trim())
    .filter(Boolean);

const joined = (line: Line) => (line.right ? `${line.text}  ${line.right}` : line.text);
const isBullet = (line: Line) => Boolean(line.bullet) || isBulletText(line.text);
const titleLike = (line: Line) => !isBullet(line) && line.text.length <= 90 && !SENTENCE_END.test(line.text) && !TECH_LABEL.test(line.text) && line.text.split(/\s+/).length <= 14;

/* ---------- Entries (jobs, schools, projects) ---------- */

interface Entry {
  titles: string[];
  dates: FoundDates | null;
  body: Line[];
}

/** Dates on a line, and what else the line says. Null when the line is ordinary text. */
function datedLine(line: Line): { dates: FoundDates; title: string } | null {
  if (isBullet(line)) return null;
  if (line.right) {
    const right = findDates(line.right);
    if (right && right.rest.length <= 3) return { dates: right, title: line.text };
    const left = findDates(line.text);
    if (left && left.rest.length <= 3) return { dates: left, title: line.right };
  }
  const found = findDates(line.text);
  if (!found) return null;
  if (found.rest.length <= 3) return { dates: found, title: "" };
  // A title with its dates in the same run of text ("Accountant, Acme (2020 - 2022)"). A lone year inside
  // a sentence is not a date line.
  return found.range && found.rest.length <= 90 && !SENTENCE_END.test(found.rest) ? { dates: found, title: found.rest } : null;
}

function splitEntries(lines: Line[]): { entries: Entry[]; loose: Line[] } {
  const dated = lines.map(datedLine);
  const anchors = dated.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  const hasEmph = lines.some((l) => l.emph);
  const entries: Entry[] = [];

  if (anchors.length === 0) {
    // No dates: split where the document itself emphasises a line, otherwise treat it as one entry.
    const starts = hasEmph ? lines.map((l, i) => (l.emph && titleLike(l) && !(i > 0 && lines[i - 1]!.emph) ? i : -1)).filter((i) => i >= 0) : [];
    const bounds = starts.length ? starts : lines.length ? [0] : [];
    bounds.forEach((start, n) => {
      const chunk = lines.slice(start, bounds[n + 1] ?? lines.length);
      const titles: string[] = [];
      while (chunk.length && titles.length < 2 && titleLike(chunk[0]!)) titles.push(joined(chunk.shift()!));
      entries.push({ titles, dates: null, body: chunk });
    });
    return { entries, loose: bounds.length ? lines.slice(0, bounds[0]) : [] };
  }

  // Work out which lines form each entry's heading (the dated line plus its title lines).
  const heads: { from: number; to: number; titles: string[] }[] = [];
  let floor = 0;
  for (const at of anchors) {
    const here = dated[at]!;
    const titles: string[] = [];
    let from = at;
    let to = at;
    const after = (limit: number) => {
      while (titles.length < limit && to + 1 < lines.length && !dated[to + 1] && !headingOf(lines[to + 1]!) && titleLike(lines[to + 1]!)) titles.push(joined(lines[++to]!));
    };
    if (here.title) {
      titles.push(here.title);
      // One more line of heading (company, place) unless the title line already names two things.
      if (splitParts(here.title).length < 2) after(2);
    } else {
      const nextOk = at + 1 < lines.length && !dated[at + 1] && titleLike(lines[at + 1]!);
      const prevOk = at - 1 >= floor && titleLike(lines[at - 1]!);
      const dateFirst = nextOk && (!prevOk || (hasEmph ? Boolean(lines[at + 1]!.emph) && !lines[at - 1]!.emph : at === floor));
      if (dateFirst) after(2);
      else {
        while (titles.length < 2 && from - 1 >= floor && titleLike(lines[from - 1]!)) titles.unshift(joined(lines[--from]!));
      }
    }
    heads.push({ from, to, titles });
    floor = to + 1;
  }
  heads.forEach((head, n) => {
    const end = heads[n + 1]?.from ?? lines.length;
    entries.push({ titles: head.titles, dates: dated[anchors[n]!]!.dates, body: lines.slice(head.to + 1, end) });
  });
  return { entries, loose: lines.slice(0, heads[0]!.from) };
}

/** Body lines → description text (paragraphs, and "- " bullets as the CV schema writes them) and a technologies list. */
function readBody(body: Line[]): { description: string; technologies: string[] } {
  const out: string[] = [];
  let technologies: string[] = [];
  const xs = body.map((l) => l.x).filter((x): x is number => x !== undefined);
  const baseX = xs.length ? Math.min(...xs) : undefined;
  let open = false; // the previous line belongs to `out` and ran to the edge of its column
  for (const line of body) {
    const text = joined(line);
    const tech = TECH_LABEL.exec(text);
    const glyph = isBulletText(line.text);
    if (tech) {
      technologies = text.slice(tech[0].length).split(/[,;|·•]/).map((t) => t.trim()).filter(Boolean);
      open = false;
      continue;
    }
    if (open && !glyph && !line.bullet) out[out.length - 1] = joinWrapped(out[out.length - 1]!, text);
    else if (line.bullet || glyph || (baseX !== undefined && line.x !== undefined && line.x > baseX + 3)) out.push(`- ${glyph ? stripBullet(text) : text}`);
    else out.push(text);
    open = Boolean(line.wraps);
  }
  return { description: out.join("\n"), technologies };
}

function placeAndName(token: string): { name: string; place?: string } {
  const at = token.lastIndexOf(", ");
  if (at <= 0) return { name: token };
  const tail = token.slice(at + 2).trim();
  if (COMPANY_TAIL.test(tail) || tail.split(/\s+/).length > 3 || /\d/.test(tail)) return { name: token };
  return { name: token.slice(0, at).trim(), place: tail };
}

function toExperience(entry: Entry): Experience {
  const parts = entry.titles.flatMap(splitParts);
  if (parts.length >= 2 && JOB_WORD.test(parts[1]!) && !JOB_WORD.test(parts[0]!)) [parts[0], parts[1]] = [parts[1]!, parts[0]!];
  const company = parts[1] ? placeAndName(parts[1]) : { name: "" };
  const { description, technologies } = readBody(entry.body);
  const location = parts[2] ?? company.place;
  return {
    ...createExperience(),
    position: parts[0] ?? "",
    company: company.name,
    ...(location ? { location } : {}),
    ...(entry.dates?.range ? { startDate: entry.dates.start, endDate: entry.dates.end } : entry.dates?.end ? { startDate: entry.dates.end } : {}),
    isCurrent: entry.dates?.isCurrent ?? false,
    description,
    technologies,
  };
}

function splitDegree(text: string): { degree?: string; fieldOfStudy?: string } {
  const sep = /\s+(?:in|of science in|of arts in)\s+|\s*,\s+|\s+ផ្នែក\s*|\s+ជំនាញ\s*|\s+[-–—]\s+/i.exec(text);
  if (sep && DEGREE_WORD.test(text.slice(0, sep.index + (/(of science in|of arts in)/i.test(sep[0]) ? sep[0].replace(/\s+in\s+$/i, "").length : 0)))) {
    const cut = /(of science in|of arts in)/i.test(sep[0]) ? sep.index + sep[0].replace(/\s+in\s+$/i, "").length : sep.index;
    const degree = text.slice(0, cut).trim();
    const fieldOfStudy = text.slice(sep.index + sep[0].length).trim();
    return { degree, ...(fieldOfStudy ? { fieldOfStudy } : {}) };
  }
  return DEGREE_WORD.test(text) ? { degree: text } : { fieldOfStudy: text };
}

function toEducation(entry: Entry): Education {
  const parts = entry.titles.flatMap(splitParts);
  let school = parts.findIndex((p) => SCHOOL_WORD.test(p));
  if (school < 0) school = parts.length > 1 && DEGREE_WORD.test(parts[0]!) ? 1 : 0;
  const institution = placeAndName(parts[school] ?? "");
  const others = parts.filter((_, i) => i !== school);
  const study = others.find((p) => DEGREE_WORD.test(p)) ?? (school === 0 ? undefined : others[0]);
  const location = institution.place ?? others.find((p) => p !== study);
  const { description } = readBody(entry.body);
  return {
    ...createEducation(),
    institution: institution.name,
    ...(study ? splitDegree(study) : {}),
    ...(location ? { location } : {}),
    ...(entry.dates?.range ? { startDate: entry.dates.start, endDate: entry.dates.end } : entry.dates?.end ? { endDate: entry.dates.end } : {}),
    ...(description ? { description } : {}),
  };
}

/* ---------- Lists ---------- */

function mergeWrapped(lines: Line[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const text = isBullet(line) ? stripBullet(joined(line)) || joined(line) : joined(line);
    if (out.length && /[,،]$/.test(out[out.length - 1]!)) out[out.length - 1] = joinWrapped(out[out.length - 1]!, text);
    else out.push(text);
  }
  return out;
}

const splitList = (text: string) =>
  text
    .split(/[,;•·|]|\s{2,}/)
    .map((t) => t.replace(/^[\s–—-]+|[\s.]+$/g, "").trim())
    .filter((t) => t && t.length <= 60);

function readSkills(lines: Line[]): SkillGroup[] {
  const rows = mergeWrapped(lines);
  const groups = new Map<string, string[]>();
  const add = (category: string, names: string[]) => groups.set(category, [...(groups.get(category) ?? []), ...names]);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const labelled = /^([^:：៖]{1,40})[:：៖]\s*(.+)$/.exec(row);
    const cells = row.split(/\s{2,}/).filter(Boolean);
    if (labelled) add(labelled[1]!.trim(), splitList(labelled[2]!));
    else if (cells.length === 2 && /[,;]/.test(cells[1]!) && !/[,;]/.test(cells[0]!)) add(cells[0]!.trim(), splitList(cells[1]!));
    else if (/[,;•·|]|\s{2,}/.test(row)) add("", splitList(row));
    else if (rows[i + 1] && /[,;]/.test(rows[i + 1]!) && !/^[^:：៖]{1,40}[:：៖]/.test(rows[i + 1]!)) add(row.trim(), splitList(rows[++i]!));
    else add("", splitList(row));
  }
  const seen = new Set<string>();
  return [...groups.entries()]
    .map(([category, names]) => ({
      id: createId(),
      category,
      skills: names.filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase())).map((name) => ({ id: createId(), name })),
    }))
    .filter((g) => g.skills.length > 0);
}

function readLanguages(lines: Line[]): LanguageSkill[] {
  const rows = lines.flatMap((line) => joined(line).split(/\s*[,;]\s+(?![^()]*\))/)).map((r) => stripBullet(r) || r);
  const out: LanguageSkill[] = [];
  for (const row of rows) {
    const text = row.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && !last.proficiency && LEVEL_WORD.test(text)) {
      last.proficiency = text;
      continue;
    }
    const m = /^(.+?)\s*(?:[:：៖–—|·-]|\s{2,})\s*(.+)$/.exec(text) ?? /^(.+?)\s*\((.+)\)$/.exec(text);
    if (m && m[1]!.trim().length <= 40) out.push({ ...createLanguageSkill(), name: m[1]!.trim(), proficiency: m[2]!.replace(/[()]/g, "").trim() });
    else if (text.length <= 40) out.push({ ...createLanguageSkill(), name: text });
  }
  return out;
}

/** Simple dated lists: certificates and awards are a name, optionally followed by who issued it. */
function readNamedItems(lines: Line[]): { name: string; issuer?: string; date?: string; description?: string }[] {
  const out: { name: string; issuer?: string; date?: string; description?: string }[] = [];
  for (const line of lines) {
    const text = isBullet(line) ? stripBullet(joined(line)) : joined(line);
    const dates = findDates(text);
    const body = dates ? dates.rest : text;
    const date = dates ? (dates.end ?? dates.start) : undefined;
    const current = out[out.length - 1];
    if (!body) {
      if (current && !current.date && date) current.date = date;
      continue;
    }
    const startsNew = !current || Boolean(line.emph) || isBullet(line) || Boolean(date && current.date) || Boolean(current.issuer);
    if (startsNew && !(current && !current.issuer && !line.emph && !isBullet(line) && !date && lines.some((l) => l.emph))) {
      const [name = body, issuer] = splitParts(body);
      out.push({ name, ...(issuer ? { issuer } : {}), ...(date ? { date } : {}) });
    } else if (current) {
      if (!current.issuer && body.length <= 80 && !SENTENCE_END.test(body)) current.issuer = body;
      else current.description = current.description ? `${current.description} ${body}` : body;
      if (date && !current.date) current.date = date;
    }
  }
  return out;
}

/* ---------- Personal details ---------- */

function readPersonal(header: Line[], contact: Line[], all: Line[], nameLine: Line | undefined): { personal: Partial<PersonalInformation>; loose: string[] } {
  const personal: Partial<PersonalInformation> = {};
  const loose: string[] = [];
  const texts: string[] = [];
  const take = (token: string, fromContact: boolean) => {
    if (PRIVATE.test(token)) return;
    const label = LABEL.exec(token);
    const value = label ? token.slice(label[0].length).trim() : token;
    const kind = label?.[1]?.toLowerCase() ?? "";
    if (!value) return;
    const email = EMAIL.exec(value);
    if (email) return void (personal.email ??= email[0]);
    if (/linkedin\.com/i.test(value)) return void (personal.linkedin ??= value);
    if (/github\.com/i.test(value)) return void (personal.github ??= value);
    if (/^(address|location|អាសយដ្ឋាន|ទីតាំង)$/.test(kind)) return void (personal.location ??= value);
    const phone = PHONE.exec(value);
    if (phone && value.replace(/\D/g, "").length >= 8 && value.replace(/[\d\s().+-]/g, "").length <= 2) return void (personal.phone ??= phone[0].trim());
    if (URL.test(value) && !/\s/.test(value)) return void (personal.website ??= value);
    if (fromContact) return void (personal.location ??= value);
    texts.push(value);
  };
  for (const line of header) for (const token of splitTokens(joined(line))) take(token, false);
  for (const line of contact) for (const token of splitTokens(joined(line))) take(token, true);
  if (!personal.email) personal.email = all.map((l) => EMAIL.exec(joined(l))?.[0]).find(Boolean);

  const isName = (text: string) => text.length <= 60 && !/[\d@:/]/.test(text) && text.split(/\s+/).length <= 6 && (text.match(/\p{L}/gu) ?? []).length >= 2;
  const name = nameLine?.text ?? texts.find(isName);
  if (name) {
    personal.fullName = name;
    const rest = texts.filter((t) => t !== name);
    const headline = rest.find((t) => t.length <= 80 && !SENTENCE_END.test(t) && !/\d{3,}/.test(t));
    if (headline) personal.headline = headline;
    for (const text of rest.filter((t) => t !== headline)) {
      if (!personal.location && text.length <= 60 && !SENTENCE_END.test(text)) personal.location = text;
      else loose.push(text);
    }
  } else loose.push(...texts);
  for (const key of Object.keys(personal) as (keyof PersonalInformation)[]) if (!personal[key]) delete personal[key];
  return { personal, loose };
}

/** The line set largest in the document is the person's name (this also finds it in two-column layouts). */
function findNameLine(lines: Line[]): Line | undefined {
  const sized = lines.filter((l) => l.size);
  if (sized.length < 4) return undefined;
  const sizes = sized.map((l) => l.size!).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)]!;
  const candidate = sized
    .filter((l) => !l.right && !headingOf(l) && l.text.length <= 60 && !/[\d@:/]/.test(l.text) && l.text.split(/\s+/).length <= 6 && (l.text.match(/\p{L}/gu) ?? []).length >= 2)
    .sort((a, b) => b.size! - a.size!)[0];
  if (!candidate || candidate.size! < median * 1.25) return undefined;
  // A monogram box ("SC") printed beside the name is decoration, not part of it.
  const monogram = /^(\p{Lu}{1,3})\s+(.+)$/u.exec(candidate.text);
  if (monogram && monogram[2]!.split(/\s+/).map((w) => w[0]).join("").toUpperCase().startsWith(monogram[1]!)) candidate.text = monogram[2]!;
  return candidate;
}

/* ---------- The recognizer ---------- */

/**
 * Turn the lines of an existing CV into CV fields using rules only. Whatever is
 * not in the text stays empty: nothing is inferred or invented. Text that does
 * not fit a section is returned in `unplaced`.
 */
export function parseCVLines(input: Line[]): ImportedCV {
  const lines = input.map((l) => ({ ...l, text: tidy(l.text), ...(l.right ? { right: tidy(l.right) } : {}) })).filter((l) => l.text && !PRIVATE.test(l.text));
  const nameLine = findNameLine(lines);
  const buckets: Record<Section | "header", Line[]> = { header: [], summary: [], experiences: [], education: [], skills: [], projects: [], certifications: [], languages: [], awards: [], contact: [], other: [] };
  let current: Section | "header" = "header";
  for (const line of lines) {
    if (line === nameLine) {
      current = "header";
      continue;
    }
    const heading = headingOf(line);
    if (heading) {
      current = heading;
      continue;
    }
    // Label-column layouts print the section name in a gutter beside its first line of content.
    const label = line.right && line.text.length <= 48 ? knownHeading(line.text) : null;
    if (label) {
      current = label;
      const { right, ...rest } = line;
      buckets[current].push({ ...rest, text: right! });
    } else buckets[current].push(line);
  }

  const { personal, loose } = readPersonal(buckets.header, buckets.contact, lines, nameLine);
  const unplaced = [...loose, ...buckets.other.map(joined)];

  const work = splitEntries(buckets.experiences);
  const study = splitEntries(buckets.education);
  const builds = splitEntries(buckets.projects);
  unplaced.push(...[...work.loose, ...study.loose, ...builds.loose].map(joined));

  const summary = readBody(buckets.summary).description.replace(/\n(?!- )/g, " ");
  const text = lines.map(joined).join("\n");
  return {
    language: detectLanguage(text),
    personal,
    summary,
    experiences: work.entries.map(toExperience).filter((e) => e.position || e.company || e.description),
    education: study.entries.map(toEducation).filter((e) => e.institution || e.degree || e.fieldOfStudy),
    skills: readSkills(buckets.skills),
    projects: builds.entries
      .map((entry) => {
        const [name = "", role] = entry.titles.flatMap(splitParts);
        const { description, technologies } = readBody(entry.body);
        const url = role && URL.test(role) && !/\s/.test(role) ? role : undefined;
        return { ...createProject(), name, description, technologies, ...(role && !url ? { role } : {}), ...(url ? { url } : {}), ...(entry.dates?.range ? { startDate: entry.dates.start, endDate: entry.dates.end } : entry.dates?.end ? { endDate: entry.dates.end } : {}) };
      })
      .filter((p) => p.name || p.description),
    certifications: readNamedItems(buckets.certifications).map((c) => ({ ...createCertification(), name: c.name, ...(c.issuer ? { issuer: c.issuer } : {}), ...(c.date ? { date: c.date } : {}) })),
    languages: readLanguages(buckets.languages),
    awards: readNamedItems(buckets.awards).map((a) => ({ ...createAward(), title: a.name, ...(a.issuer ? { issuer: a.issuer } : {}), ...(a.date ? { date: a.date } : {}), ...(a.description ? { description: a.description } : {}) })),
    unplaced: unplaced.filter(Boolean),
  };
}

/** Recognize a CV given as plain text (one line per line). */
export function parseCVText(text: string): ImportedCV {
  return parseCVLines(
    text.split(/\r?\n/).map((raw) => {
      const [left = "", ...rest] = raw.split("\t");
      const right = rest.join(" ").trim();
      return { text: left, ...(left.trim() && right ? { right } : !left.trim() && right ? { text: right } : {}) };
    }),
  );
}
