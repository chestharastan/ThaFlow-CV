/** Date recognition for CV text. Output uses the CV schema's partial dates: "YYYY" or "YYYY-MM". */

const MONTHS: [RegExp, number][] = [
  [/^(jan(uary)?|មករា)$/i, 1],
  [/^(feb(ruary)?|កុម្ភៈ|កុម្ភះ|កុម្ភ)$/i, 2],
  [/^(mar(ch)?|មីនា|មិនា)$/i, 3],
  [/^(apr(il)?|មេសា)$/i, 4],
  [/^(may|ឧសភា)$/i, 5],
  [/^(jun(e)?|មិថុនា)$/i, 6],
  [/^(jul(y)?|កក្កដា)$/i, 7],
  [/^(aug(ust)?|សីហា)$/i, 8],
  [/^(sep(t(ember)?)?|កញ្ញា)$/i, 9],
  [/^(oct(ober)?|តុលា)$/i, 10],
  [/^(nov(ember)?|វិច្ឆិកា)$/i, 11],
  [/^(dec(ember)?|ធ្នូ)$/i, 12],
];
const MONTH_WORD = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|មករា|កុម្ភៈ|កុម្ភះ|កុម្ភ|មីនា|មិនា|មេសា|ឧសភា|មិថុនា|កក្កដា|សីហា|កញ្ញា|តុលា|វិច្ឆិកា|ធ្នូ";
const YEAR = "(?:19|20)\\d{2}";
/** One date: "Jan 2022", "ខែមករា ឆ្នាំ2022", "03/2021", "2021-03", "2021". */
const DATE = `(?:(?:ខែ\\s*)?(?:${MONTH_WORD})\\.?,?\\s*(?:ឆ្នាំ\\s*)?${YEAR}|(?:0?[1-9]|1[0-2])[/.]${YEAR}|${YEAR}[/.-](?:0[1-9]|1[0-2])(?!\\d)|(?:ឆ្នាំ\\s*)?${YEAR})`;
const PRESENT = "present|current|now|today|ongoing|to date|បច្ចុប្បន្ន|ឥឡូវនេះ|សព្វថ្ងៃ";
const RANGE = new RegExp(`(?<![\\w/])(${DATE})\\s*(?:[-–—~]|to|until|till|ដល់)\\s*(${DATE}|${PRESENT})(?![\\w/])`, "i");
const SINGLE = new RegExp(`(?<![\\w/.-])(${DATE})(?![\\w/-])`, "i");

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
export const asciiDigits = (text: string) => text.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));

function parseDate(token: string): string | undefined {
  const t = token.replace(/ខែ|ឆ្នាំ/g, " ").trim();
  let m = /^(\d{1,2})[/.]((?:19|20)\d{2})$/.exec(t);
  if (m) return `${m[2]}-${m[1]!.padStart(2, "0")}`;
  m = /^((?:19|20)\d{2})[/.-](\d{2})$/.exec(t);
  if (m) return `${m[1]}-${m[2]}`;
  m = /^(\D+?)\.?,?\s*((?:19|20)\d{2})$/.exec(t);
  if (m) {
    const month = MONTHS.find(([re]) => re.test(m![1]!.trim()))?.[1];
    return month ? `${m[2]}-${String(month).padStart(2, "0")}` : m[2];
  }
  m = /^((?:19|20)\d{2})$/.exec(t);
  return m ? m[1] : undefined;
}

export interface FoundDates {
  start?: string;
  end?: string;
  isCurrent: boolean;
  /** True when a range (two dates, or a date and "present") was written, not one date. */
  range: boolean;
  /** The text with the date removed. */
  rest: string;
}

/** Find a date range, or failing that a single date, in a piece of text. */
export function findDates(input: string): FoundDates | null {
  const text = asciiDigits(input);
  const range = RANGE.exec(text);
  if (range) {
    const start = parseDate(range[1]!);
    const current = new RegExp(`^(?:${PRESENT})$`, "i").test(range[2]!.trim());
    const end = current ? undefined : parseDate(range[2]!);
    if (start) return { start, ...(end ? { end } : {}), isCurrent: current, range: true, rest: cleanRest(text.replace(range[0], " ")) };
  }
  const single = SINGLE.exec(text);
  if (single) {
    const date = parseDate(single[1]!);
    if (date) return { end: date, isCurrent: false, range: false, rest: cleanRest(text.replace(single[0], " ")) };
  }
  return null;
}

function cleanRest(text: string): string {
  return text
    .replace(/[([{]\s*[)\]}]/g, " ")
    .replace(/^[\s,;:|·•–—-]+|[\s,;:|·•–—(-]+$/g, "")
    .replace(/[ \t]{3,}/g, "  ")
    .trim();
}
