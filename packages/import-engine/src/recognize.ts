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
import { headingOf, knownHeading, weakHeading, type Section } from "./headings";
import { isBulletText, joinWrapped, stripBullet, tidy, type Line } from "./lines";
import type { ImportedCV } from "./types";

/* ---------- Small recognizers ---------- */

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const URL = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;]*)?/i;
const PHONE = /(?:\+|\(?\b0)[\d\s().-]{6,}\d|\b\d{3}[\s.-]\d{3}[\s.-]\d{3,4}\b/;
/** A web address and nothing else. */
const BARE_URL = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;]*)?$/i;
/** Personal data a modern CV should not carry; dropped on import. */
const PRIVATE = /^(date of birth|d\.?o\.?b\.?|birth ?date|born|place of birth|gender|sex|marital status|nationality|religion|id (card|number|no)|national id|passport|height|weight|health|age|ថ្ងៃខែឆ្នាំកំណើត|ថ្ងៃកំណើត|ទីកន្លែងកំណើត|ភេទ|សញ្ជាតិ|ស្ថានភាពគ្រួសារ|អត្តសញ្ញាណប័ណ្ណ|លេខអត្តសញ្ញាណប័ណ្ណ|សាសនា|កម្ពស់|ទម្ងន់|សុខភាព|អាយុ)\s*[:：៖-]/i;
const LABEL = /^(e-?mail|email address|phone|phone number|mobile number|tel|telephone|mobile|cell|address|current address|location|website|web|linkedin|github|telegram|អ៊ីមែល|ទូរស័ព្ទ|លេខទូរស័ព្ទ|អាសយដ្ឋាន|អាសយដ្ឋានបច្ចុប្បន្ន|ទីលំនៅបច្ចុប្បន្ន|ទីតាំង|គេហទំព័រ)\s*[:：៖]\s*/i;
/** A CV set as a form names the person and the job on labelled rows: "Name : Sok Dara", "Apply for : Cashier". */
const NAME_LABEL = /^(name|full name|name in full|surname and name|ឈ្មោះ|ឈ្មោះពេញ|នាមត្រកូល និង ?នាម|គោត្តនាម និង ?នាម)\s*[:：៖]\s*/i;
const POSITION_LABEL = /^(position|position appl(?:y|ied)(?: for)?|appl(?:y|ying|ied) for|applied position|desired position|job title|មុខតំណែង|មុខតំណែងដែលស្នើសុំ|ដាក់ពាក្យមុខតំណែង|សុំបំរើការងារផ្នែក|ស្នើសុំដាក់ពាក្យផ្នែក)\s*[:：៖]\s*/i;
/** What a page is headed with before the CV starts: the document's title, and the national motto of a formal Cambodian sheet. */
const PAGE_TITLE = /^(curriculum vitae|curriculum vitæ|c\.?v\.?|resume|résumé|kingdom of cambodia|nation,? religion,? king|ប្រវត្តិរូបសង្ខេប|ប្រវត្តិរូប|ជីវប្រវត្តិ|ជីវប្រវត្តិសង្ខេប|ព្រះរាជាណាចក្រកម្ពុជា|ជាតិ សាសនា ព្រះមហាក្សត្រ)$/i;
const SENTENCE_END = /[.។!?]$/;
const JOB_WORD = /\b(manager|developer|engineer|assistant|officer|analyst|accountant|intern|director|teacher|lecturer|designer|consultant|specialist|coordinator|lead|head|executive|supervisor|technician|clerk|cashier|driver|nurse|administrator|representative|associate|trainee|volunteer|founder|owner|chef|waiter|waitress|receptionist|secretary|tutor|researcher|editor|writer|architect|auditor|agent|advisor|operator|salesperson|sales)\b|ប្រធាន|អ្នកគ្រប់គ្រង|អ្នកអភិវឌ្ឍ|ជំនួយការ|មន្ត្រី|មន្រ្តី|គណនេយ្យករ|វិស្វករ|គ្រូ|បុគ្គលិក|អ្នកវិភាគ|អ្នកលក់|អ្នកបកប្រែ|កម្មសិក្សាការី|នាយក|អ្នករចនា|បេឡាករ|លេខា/i;
const SCHOOL_WORD = /\b(university|college|institute|school|academy|polytechnic|faculty)\b|សាកលវិទ្យាល័យ|វិទ្យាស្ថាន|សាលា|វិទ្យាល័យ|មហាវិទ្យាល័យ|សាលារៀន/i;
const DEGREE_WORD = /\b(bachelor|master|doctor|ph\.?d|b\.?sc|m\.?sc|b\.?a|m\.?a|mba|bba|b\.?eng|m\.?eng|diploma|associate|certificate|degree|high school|baccalaureate)\b|បរិញ្ញាបត្រ|បរិញ្ញាបត្រជាន់ខ្ពស់|អនុបណ្ឌិត|បណ្ឌិត|សញ្ញាបត្រ|បាក់ឌុប|មធ្យមសិក្សា/i;
const TECH_LABEL = /^(technologies|tools|tech stack|stack|tools and technologies|បច្ចេកវិទ្យា|ឧបករណ៍)\s*[:：៖]\s*/i;
const LEVEL_WORD = /^(native|mother tongue|fluent|proficient|advanced|upper[- ]intermediate|intermediate|pre[- ]intermediate|conversational|working proficiency|professional( working)? proficiency|good|very good|excellent|fair|basic|beginner|elementary|[abc][12]|ភាសាកំណើត|ស្ទាត់ជំនាញ|ស្ទាត់|ល្អ|ល្អណាស់|មធ្យម|មូលដ្ឋាន|កម្រិតមូលដ្ឋាន|កម្រិតមធ្យម|កម្រិតខ្ពស់|អាចប្រើការបាន)\b/i;
const COMPANY_TAIL = /^(ltd|inc|llc|co|plc|corp|limited|pte|gmbh)\.?$/i;
/** Words that mark a piece of text as an address rather than a job title. */
const PLACE_WORD = /\b(phnom penh|cambodia|siem reap|battambang|sihanoukville|kampong \w+|kampot|kandal|takeo|takhmao|poipet|sangkat|khan|street|st\.|road|rd\.|avenue|ave\.|boulevard|blvd\.?|district|province|village|commune|borey)\b|#\s?\d+|ភ្នំពេញ|កម្ពុជា|សង្កាត់|ខណ្ឌ|ផ្លូវ|ភូមិ|ឃុំ|ស្រុក|ខេត្ត|រាជធានី|ក្រុង|សៀមរាប|បាត់ដំបង|ផ្ទះលេខ/i;
const isPlace = (text: string) => text.length <= 120 && !SENTENCE_END.test(text) && (PLACE_WORD.test(text) || ((text.match(/,/g) ?? []).length >= 2 && !JOB_WORD.test(text) && !/[@:]/.test(text) && text.split(/\s+/).length <= 12));

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
/** A row label keeps its value: "Address:  12 Street 240" is one piece, not two. */
const labelWithValue = (text: string) => text.replace(/^([^:：៖|·•]{1,40}[:：៖])\s{2,}/, "$1 ");
const isBullet = (line: Line) => Boolean(line.bullet) || isBulletText(line.text);
const titleLike = (line: Line) => !isBullet(line) && line.text.length <= 90 && !SENTENCE_END.test(line.text) && !TECH_LABEL.test(line.text) && line.text.split(/\s+/).length <= 14;

/** How far apart two left edges must be to count as different. Measured from a picture, an edge is a few points out. */
const slack = (line: Line) => (line.loose ? Math.max(3, (line.size ?? 10) * 0.6) : 3);
/** A line set further in than another: the text of a list item, when the bullet itself is not in the file. */
const indentedFrom = (line: Line, from: Line) => line.x !== undefined && from.x !== undefined && line.x > from.x + slack(line);

/** A line that stops on a word which cannot end a phrase ("Bachelor of", "Data Science and") carries on below. */
const DANGLING = /(?:\b(?:and|of|in|for|the|to|at|with|on|a|an)|[&,،])$/i;
/** A line that opens the way a point in a CV does: with a capitalised action verb. */
const OPENS_POINT = /^(?:\p{Lu}\p{Ll}+(?:ed|ing)|Led|Built|Ran|Won|Grew|Cut|Made|Set|Wrote|Taught|Oversaw|Drove|Sold|Spoke|Held|Kept|Took|Gave|Began|Rebuilt|Brought|Sent|Met|Lead|Manage|Develop|Create|Design|Build|Support|Assist|Provide|Prepare|Conduct|Coordinate|Maintain|Ensure|Handle|Perform|Responsible)\b/u;
/** A line that opens with a short label and a colon ("Tools: Git, Linux") starts something new. */
const OPENS_LABEL = /^[^:：៖]{1,30}[:：៖]\s/;

/**
 * Put lines that were broken only because the column ended back together, so that a job title or an
 * address wrapped in a narrow column reads as one line again. Lines join when the first ran to the edge
 * (or stops mid-phrase) and the second carries on in the same style; a new bullet, a label, a heading or
 * a change of weight starts afresh.
 */
function unwrap(lines: Line[], options: { anyIndent?: boolean; list?: boolean; contact?: boolean } = {}): Line[] {
  const out: Line[] = [];
  for (const line of lines) {
    const previous = out[out.length - 1];
    const dates = findDates(line.text);
    const fresh =
      Boolean(line.right) ||
      Boolean(line.bullet) ||
      isBulletText(line.text) ||
      Boolean(headingOf(line)) ||
      OPENS_LABEL.test(line.text) ||
      // A line that is only a date is the date of an entry, not the end of the sentence above it.
      Boolean(dates && dates.rest.length <= 3) ||
      (options.contact && (EMAIL.test(line.text) || PHONE.test(line.text))) ||
      // A web address on a line of its own is a detail of its own, unless the line above broke off inside one.
      Boolean(options.contact && previous && BARE_URL.test(line.text) && !/[.@/_-]$/.test(previous.text));
    let joins = false;
    if (previous && !fresh) {
      // Bold and italic are both "not the body face": where the faces are known, a title and the line under it differ.
      const sameFace = previous.face === undefined || line.face === undefined || (previous.endFace ?? previous.face) === line.face;
      const sameStyle = sameFace && Boolean(previous.tail ?? previous.emph) === Boolean(line.emph) && Math.abs((previous.size ?? 0) - (line.size ?? 0)) <= 0.6;
      const hanging = isBulletText(previous.text) ? 18 : slack(line);
      const aligned = options.anyIndent || previous.x === undefined || line.x === undefined || (line.x <= previous.x + hanging && line.x >= previous.x - 60);
      const midPhrase = DANGLING.test(previous.text) || /\p{L}-$/u.test(previous.text);
      // In a list of names a line end is normally the end of an item. Only a comma, a hyphen, or one stray
      // word left over from a comma list ("Microsoft" / "Office") says otherwise.
      // Contact details are short lines, often centred, so reaching the edge means nothing there either.
      // In running text, a line that opens with an action verb ("Organised", "Built") is the next point of
      // a list whose bullets are not in the file, even when the line above happened to fill its column.
      const carries = options.list
        ? midPhrase || (Boolean(previous.wraps) && (/^\p{Ll}/u.test(line.text) || (/[,،]/.test(previous.text) && !/[,،;]/.test(line.text) && line.text.split(/\s+/).length <= 2)))
        : options.contact
          ? midPhrase || /[@/][^\s]*[.@/_-]$/.test(previous.text) || (Boolean(previous.wraps) && !EMAIL.test(previous.text) && !PHONE.test(previous.text) && !URL.test(previous.text))
          : midPhrase || (Boolean(previous.wraps) && !OPENS_POINT.test(line.text));
      // In the header a title broken after "&" or a comma carries on whatever the weight of the two halves.
      joins = (sameStyle || (Boolean(options.contact) && midPhrase)) && aligned && carries;
    }
    if (previous && joins) {
      const { wraps: _wraps, tail: _tail, ...rest } = previous;
      // An e-mail or web address broken across lines ("name@example." / "com") has no space in it.
      const address = options.contact && /[@/]/.test(previous.text) && !/\s/.test(previous.text) && (/[.@/_-]$/.test(previous.text) || /^[.@/_-]/.test(line.text));
      const text = address ? previous.text + line.text : joinWrapped(previous.text, line.text);
      out[out.length - 1] = { ...rest, text, ...(line.wraps ? { wraps: true } : {}), ...(line.tail !== undefined ? { tail: line.tail } : {}) };
    } else out.push(line);
  }
  return out;
}

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
  // "2019: Diploma in Accounting": dates that open the line and end in a colon label what follows.
  const led = /^([^:：៖]{4,40})[:：៖]\s+(\S.*)$/.exec(line.text);
  const opening = led ? findDates(led[1]!) : null;
  if (led && opening && opening.rest.length <= 3) return { dates: opening, title: led[2]! };
  const found = findDates(line.text);
  if (!found) return null;
  if (found.rest.length <= 3) return { dates: found, title: "" };
  // A title with its dates in the same run of text ("Accountant, Acme (2020 - 2022)"). A lone year inside
  // a sentence is not a date line.
  return found.range && found.rest.length <= 90 && !SENTENCE_END.test(found.rest) ? { dates: found, title: found.rest } : null;
}

/** A second heading line (the employer, the place) is short and starts level with the first. Anything else is the entry's text. */
function secondTitle(line: Line, lead: Line | undefined): boolean {
  return line.text.split(/\s+/).length <= 10 && !(lead && indentedFrom(line, lead));
}

function splitEntries(lines: Line[]): { entries: Entry[]; loose: Line[] } {
  const dated = lines.map(datedLine);
  const anchors = dated.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  const hasEmph = lines.some((l) => l.emph);
  const entries: Entry[] = [];

  if (anchors.length === 0) {
    // No dates: split where the document itself emphasises a line, otherwise treat it as one entry.
    const starts = hasEmph ? lines.map((l, i) => (l.emph && titleLike(l) && !(i > 0 && lines[i - 1]!.emph) ? i : -1)).filter((i) => i >= 0) : [];
    // Text before the first emphasised title is an entry too, when it opens with something like a title.
    if (starts.length && starts[0]! > 0 && titleLike(lines[0]!) && lines[0]!.text.split(/\s+/).length <= 10) starts.unshift(0);
    const bounds = starts.length ? starts : lines.length ? [0] : [];
    bounds.forEach((start, n) => {
      const chunk = lines.slice(start, bounds[n + 1] ?? lines.length);
      const titles: string[] = [];
      const lead = chunk[0];
      while (chunk.length && titles.length < 2 && titleLike(chunk[0]!) && (titles.length === 0 || secondTitle(chunk[0]!, lead!))) titles.push(joined(chunk.shift()!));
      entries.push({ titles, dates: null, body: chunk });
    });
    return { entries, loose: bounds.length ? lines.slice(0, bounds[0]) : [] };
  }

  // A date on a line of its own either opens every entry of a section or closes every one. The first entry shows which.
  const alone = anchors.filter((i) => !dated[i]!.title);
  const before = alone.length ? lines.slice(0, alone[0]) : [];
  const order: "first" | "last" | null = !alone.length ? null : alone[0] === 0 ? "first" : before.length <= 3 && before.every((l) => titleLike(l)) ? "last" : null;

  // Work out which lines form each entry's heading (the dated line plus its title lines).
  const heads: { from: number; to: number; titles: string[] }[] = [];
  let floor = 0;
  for (const at of anchors) {
    const here = dated[at]!;
    const titles: string[] = [];
    let from = at;
    let to = at;
    // When the date sits in a margin the title starts further in than the dated line, so indentation says nothing.
    const lead = here.title && lines[at]!.text.startsWith(here.title.split(/\s+/)[0]!) ? lines[at]! : undefined;
    const after = (limit: number) => {
      while (titles.length < limit && to + 1 < lines.length && !dated[to + 1] && !headingOf(lines[to + 1]!) && titleLike(lines[to + 1]!) && (titles.length === 0 || secondTitle(lines[to + 1]!, lead))) titles.push(joined(lines[++to]!));
    };
    if (here.title) {
      titles.push(here.title);
      // One more line of heading (company, place) unless the title line already names two things.
      if (splitParts(here.title).length < 2) after(2);
    } else {
      const nextOk = at + 1 < lines.length && !dated[at + 1] && titleLike(lines[at + 1]!);
      const prevOk = at - 1 >= floor && titleLike(lines[at - 1]!);
      const dateFirst = order === "first" ? nextOk : order === "last" ? nextOk && !prevOk : nextOk && (!prevOk || (hasEmph ? Boolean(lines[at + 1]!.emph) && !lines[at - 1]!.emph : at === floor));
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
  for (const line of body) {
    const text = joined(line);
    const tech = TECH_LABEL.exec(text);
    const glyph = isBulletText(line.text);
    if (tech) {
      technologies = text.slice(tech[0].length).split(/[,;|·•]/).map((t) => t.trim()).filter(Boolean);
      continue;
    }
    if (line.bullet || glyph || (baseX !== undefined && line.x !== undefined && line.x > baseX + slack(line))) out.push(`- ${glyph ? stripBullet(text) : text}`);
    else out.push(text);
  }
  return { description: out.join("\n"), technologies };
}

function placeAndName(token: string): { name: string; place?: string } {
  const at = token.lastIndexOf(", ");
  if (at <= 0) return { name: token };
  const tail = token.slice(at + 2).trim();
  if (COMPANY_TAIL.test(tail) || tail.split(/\s+/).length > 3 || /\d/.test(tail) || /^\p{Lu}{2,6}$/u.test(tail)) return { name: token };
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

interface ListRow {
  text: string;
  /** Opens with a bold label and carries on in the ordinary face: "Product  Roadmapping  User research". */
  labelled: boolean;
  /** Bold from start to end: a line that names a group. */
  bold: boolean;
}

function mergeWrapped(lines: Line[]): ListRow[] {
  const out: ListRow[] = [];
  const marked = lines.some((l) => l.emph) && !lines.every((l) => l.emph && l.tail !== false);
  for (const line of lines) {
    const text = isBullet(line) ? stripBullet(joined(line)) || joined(line) : joined(line);
    const last = out[out.length - 1];
    if (last && /[,،]$/.test(last.text)) last.text = joinWrapped(last.text, text);
    else out.push({ text, labelled: Boolean(line.emph) && line.tail === false, bold: marked && Boolean(line.emph) && line.tail !== false });
  }
  return out;
}

const splitList = (text: string) =>
  text
    .split(/[,;•·|]|\s{2,}/)
    .map((t) => t.replace(/^[\s–—-]+|[\s.]+$/g, "").trim())
    // A skill is a name: never a date, and never a whole sentence.
    .filter((t) => t && t.length <= 60 && t.split(/\s+/).length <= 7 && !((findDates(t)?.rest.length ?? 99) <= 3));

function readSkills(lines: Line[]): SkillGroup[] {
  const rows = mergeWrapped(lines);
  const groups = new Map<string, string[]>();
  const add = (category: string, names: string[]) => groups.set(category, [...(groups.get(category) ?? []), ...names]);
  // The group that lines without a label of their own belong to: set by a bold line standing alone.
  let open = "";
  for (let i = 0; i < rows.length; i++) {
    const { text: row, labelled: lead, bold } = rows[i]!;
    const labelled = /^([^:：៖]{1,40})[:：៖]\s*(.+)$/.exec(row);
    const cells = row.split(/\s{2,}/).filter(Boolean);
    const next = rows[i + 1];
    if (labelled) add(labelled[1]!.trim(), splitList(labelled[2]!));
    else if (lead && cells.length >= 2 && !/[,;]/.test(cells[0]!)) add(cells[0]!.trim(), cells.slice(1).flatMap(splitList));
    else if (cells.length === 2 && /[,;]/.test(cells[1]!) && !/[,;]/.test(cells[0]!)) add(cells[0]!.trim(), splitList(cells[1]!));
    else if (bold && cells.length === 1 && !/[,;]/.test(row) && row.split(/\s+/).length <= 4 && next && !next.bold) open = row.replace(/[:：៖]\s*$/, "").trim();
    else if (/[,;•·|]|\s{2,}/.test(row)) add(open, splitList(row));
    else if (!open && next && /[,;]/.test(next.text) && !/^[^:：៖]{1,40}[:：៖]/.test(next.text)) add(row.trim(), splitList(rows[++i]!.text));
    else add(open, splitList(row));
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
    // "Khmer: Native", "Khmer - Native", "Khmer (Native)", or simply "Khmer Native".
    const m = /^(.+?)\s*(?:[:：៖–—|·-]|\s{2,})\s*(.+)$/.exec(text) ?? /^(.+?)\s*\((.+)\)$/.exec(text) ?? (LEVEL_WORD.test(text.split(/\s+/).slice(1).join(" ")) ? /^(\S+)\s+(.+)$/.exec(text) : null);
    if (m && m[1]!.trim().length <= 40) out.push({ ...createLanguageSkill(), name: m[1]!.trim(), proficiency: m[2]!.replace(/[()]/g, "").trim() });
    else if (text.length <= 40) out.push({ ...createLanguageSkill(), name: text });
  }
  return out;
}

/** Simple dated lists: certificates and awards are a name, optionally followed by who issued it. */
function readNamedItems(input: Line[]): { name: string; issuer?: string; date?: string; description?: string }[] {
  const out: { name: string; issuer?: string; date?: string; description?: string }[] = [];
  // Names are set in one face. A line in another (an italic issuer under a bold name) is not a name,
  // and when every line is set in the heavier face it tells names and issuers apart no longer.
  const nameFace = input.find((l) => l.emph)?.face;
  const marked = input.map((l) => (l.emph && nameFace !== undefined && l.face !== undefined && l.face !== nameFace ? (({ emph: _emph, ...rest }) => rest as Line)(l) : l));
  const lines = marked.every((l) => l.emph) ? marked.map(({ emph: _emph, ...rest }) => rest as Line) : marked;
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
  // What the document itself labels as the name and the job, which settles both.
  const stated: { name?: string; headline?: string } = {};
  const take = (token: string, fromContact: boolean) => {
    if (PRIVATE.test(token)) return;
    const name = NAME_LABEL.exec(token);
    if (name) return void (stated.name ??= token.slice(name[0].length).trim() || undefined);
    const position = POSITION_LABEL.exec(token);
    if (position) return void (stated.headline ??= token.slice(position[0].length).trim() || undefined);
    const label = LABEL.exec(token);
    const value = label ? token.slice(label[0].length).trim() : token;
    const kind = label?.[1]?.toLowerCase() ?? "";
    if (!value) return;
    const email = EMAIL.exec(value);
    if (email) {
      personal.email ??= email[0];
      // A separator misread from a picture ("a@b.com I +855 12 345 678") leaves two things in one piece.
      const rest = value.replace(email[0], " ").replace(/^[\s|Il,;·-]+|[\s|Il,;·-]+$/g, "");
      if (rest.length >= 6) take(rest, fromContact);
      return;
    }
    if (/linkedin\.com/i.test(value)) return void (personal.linkedin ??= value);
    if (/github\.com/i.test(value)) return void (personal.github ??= value);
    if (/^(address|current address|location|អាសយដ្ឋាន|អាសយដ្ឋានបច្ចុប្បន្ន|ទីលំនៅបច្ចុប្បន្ន|ទីតាំង)$/.test(kind)) return void (personal.location ??= value);
    const phone = PHONE.exec(value);
    if (phone && value.replace(/\D/g, "").length >= 8 && value.replace(/[\d\s().+-]/g, "").length <= 2) return void (personal.phone ??= phone[0].trim());
    if (URL.test(value) && !/\s/.test(value)) return void (personal.website ??= value);
    // An address is an address wherever it stands: above the job title as well as below it.
    if (isPlace(value) && (fromContact || nameLine || texts.length > 0) && !personal.location) return void (personal.location = value);
    if (fromContact) return void (personal.location ??= value);
    texts.push(value);
  };
  for (const line of header) for (const token of splitTokens(labelWithValue(joined(line)))) take(token, false);
  for (const line of contact) for (const token of splitTokens(labelWithValue(joined(line)))) take(token, true);
  if (!personal.email) personal.email = all.map((l) => EMAIL.exec(joined(l))?.[0]).find(Boolean);

  const isName = (text: string) => text.length <= 60 && !/[\d@:/]/.test(text) && text.split(/\s+/).length <= 6 && (text.match(/\p{L}/gu) ?? []).length >= 2;
  const name = stated.name ?? nameLine?.text ?? texts.find(isName);
  if (name) {
    personal.fullName = name;
    const rest = texts.filter((t) => t !== name);
    const headline = stated.headline ?? rest.find((t) => t.length <= 80 && !SENTENCE_END.test(t) && !/\d{3,}/.test(t));
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
  // A name too long for its column is set on two lines of the same size.
  const below = lines[lines.indexOf(candidate) + 1];
  if (below && !below.right && below.size !== undefined && Math.abs(below.size - candidate.size!) <= 0.3 && candidate.text.split(/\s+/).length <= 2 && below.text.split(/\s+/).length <= 2 && !/[\d@:/,]/.test(below.text) && !headingOf(below)) {
    candidate.text = joinWrapped(candidate.text, below.text);
    lines.splice(lines.indexOf(below), 1);
  }
  // A monogram box ("SC") printed beside the name is decoration, not part of it.
  const monogram = /^(\p{Lu}{1,3})\s+(.+)$/u.exec(candidate.text);
  if (monogram && monogram[2]!.split(/\s+/).map((w) => w[0]).join("").toUpperCase().startsWith(monogram[1]!)) candidate.text = monogram[2]!;
  return candidate;
}

/* ---------- Section titles ---------- */

const isCapitals = (text: string) => /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);

/**
 * Which lines are section titles, and of which section.
 *
 * Titles we know by name are found first. They also show how this document sets its titles (capitals,
 * a larger size, a heavier face), and that settles two harder cases: words that are only sometimes a
 * title ("Tools", "Leadership"), and titles we have no name for, whose content must not run on into
 * the section above.
 */
function sectionTitles(lines: Line[], nameLine: Line | undefined): Map<Line, Section> {
  const titles = new Map<Line, Section>();
  for (const line of lines) {
    if (line === nameLine) continue;
    const section = headingOf(line);
    if (section) titles.set(line, section);
  }
  const known = [...titles.keys()];
  // The look the known titles share. Without at least two that agree there is nothing to go by.
  const sizes = known.map((l) => l.size).filter((v): v is number => v !== undefined);
  const size = sizes.length ? sizes.slice().sort((a, b) => a - b)[Math.floor(sizes.length / 2)]! : undefined;
  const agree = known.length >= 2 && known.every((l) => size === undefined || l.size === undefined || Math.abs(l.size - size) <= 0.4);
  const capitals = agree && known.every((l) => isCapitals(l.text));
  const heavy = agree && known.every((l) => l.emph);
  const bodySizes = lines.map((l) => l.size).filter((v): v is number => v !== undefined).sort((a, b) => a - b);
  const body = bodySizes.length ? bodySizes[Math.floor(bodySizes.length / 2)]! : undefined;
  const larger = agree && size !== undefined && body !== undefined && size >= body * 1.1;
  const setLikeTitle = (line: Line) =>
    agree &&
    !line.right &&
    !isBullet(line) &&
    (size === undefined || line.size === undefined || Math.abs(line.size - size) <= 0.4) &&
    (!capitals || isCapitals(line.text)) &&
    (!heavy || Boolean(line.emph));

  const unnamed: Line[] = [];
  lines.forEach((line, i) => {
    if (line === nameLine || titles.has(line) || line.right || isBullet(line)) return;
    const weak = weakHeading(line.text);
    if (weak) {
      // Without a house style to compare with, capitals or a Word heading style are the only evidence.
      if (agree ? setLikeTitle(line) : isCapitals(line.text) || line.heading) titles.set(line, weak);
      return;
    }
    // A title we have no name for: set exactly like the known ones, in a way ordinary lines are not.
    // Capitals alone prove nothing ("ACCA", "RUPP"), and nor does bold alone (job titles are bold too).
    if (!(larger || (capitals && heavy)) || !setLikeTitle(line)) return;
    const words = line.text.split(/\s+/);
    if (words.length > 4 || line.text.length > 32 || /[\d@,.;:]/.test(line.text) || (line.text.match(/\p{L}/gu) ?? []).length < 3) return;
    // A job title set in the same style is followed by its dates; a section title is not.
    if (lines.slice(i, i + 3).some((l) => datedLine(l))) return;
    unnamed.push(line);
  });
  // More unnamed "titles" than named ones means the style is not special to titles after all.
  const first = known.length ? Math.min(...known.map((l) => lines.indexOf(l))) : -1;
  if (unnamed.length <= known.length) for (const line of unnamed) if (lines.indexOf(line) > first) titles.set(line, "other");
  return titles;
}

/* ---------- Forms ---------- */

/**
 * A CV typed as a form sets each row as a label, a tab, then a colon and the value ("Name ⇥ : Sok Dara").
 * The colon belongs with the label, where every rule that reads labels expects it.
 */
function formRow(line: Line): Line {
  const colon = line.right ? /^[:：៖]\s*/.exec(line.right) : null;
  if (!colon || /[:：៖]$/.test(line.text)) return line;
  const { right, ...rest } = line;
  const value = right!.slice(colon[0].length);
  return { ...rest, text: `${line.text}:`, ...(value ? { right: value } : {}) };
}

/** The first lines of a page are often its title and nothing else. They are not the person's name, nor a section. */
function withoutPageTitle(lines: Line[]): Line[] {
  let content = 0;
  return lines.filter((line) => {
    if (content >= 3) return true;
    if (!line.right && PAGE_TITLE.test(line.text.replace(/\s+/g, " ").trim())) return false;
    content += 1;
    return true;
  });
}

/* ---------- The recognizer ---------- */

/**
 * Turn the lines of an existing CV into CV fields using rules only. Whatever is
 * not in the text stays empty: nothing is inferred or invented. Text that does
 * not fit a section is returned in `unplaced`.
 */
export function parseCVLines(input: Line[]): ImportedCV {
  const tidied = input.map((l) => formRow({ ...l, text: tidy(l.text), ...(l.right ? { right: tidy(l.right) } : {}) })).filter((l) => l.text && !PRIVATE.test(l.text));
  const lines = withoutPageTitle(tidied);
  const nameLine = findNameLine(lines);
  const titled = sectionTitles(lines, nameLine);
  const sorted: Record<Section | "header", Line[]> = { header: [], summary: [], experiences: [], education: [], skills: [], projects: [], certifications: [], languages: [], awards: [], contact: [], other: [] };
  let current: Section | "header" = "header";
  for (const line of lines) {
    if (line === nameLine) {
      current = "header";
      continue;
    }
    const heading = titled.get(line);
    if (heading) {
      current = heading;
      continue;
    }
    // Label-column layouts print the section name in a gutter beside its first line of content.
    const label = line.right && line.text.length <= 48 ? knownHeading(line.text) : null;
    if (label) {
      current = label;
      // What is left of the line starts where the label ended, not where the label began.
      const { right, x: _x, ...rest } = line;
      sorted[current].push({ ...rest, text: right! });
    } else sorted[current].push(line);
  }
  const buckets = Object.fromEntries(
    Object.entries(sorted).map(([key, list]) => {
      const contact = key === "header" || key === "contact";
      return [key, unwrap(list, { anyIndent: contact, contact, list: key === "skills" || key === "languages" })];
    }),
  ) as typeof sorted;

  const { personal, loose } = readPersonal(buckets.header, buckets.contact, lines.filter((l) => !sorted.other.includes(l)), nameLine);
  const unplaced = [...loose, ...buckets.other.map(joined)];

  const work = splitEntries(buckets.experiences);
  const study = splitEntries(buckets.education);
  const builds = splitEntries(buckets.projects);
  unplaced.push(...[...work.loose, ...study.loose, ...builds.loose].map(joined));

  const jobs = work.entries.map(toExperience);
  // Text under "Experience" with no job title or employer to hang it on is kept aside, not shown as a blank job.
  unplaced.push(...jobs.filter((e) => !e.position && !e.company && e.description).map((e) => e.description));

  const summary = readBody(buckets.summary).description.replace(/\n(?!- )/g, " ");
  const text = lines.map(joined).join("\n");
  return {
    language: detectLanguage(text),
    personal,
    summary,
    experiences: jobs.filter((e) => e.position || e.company),
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
