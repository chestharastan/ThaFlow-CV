import { describe, expect, it } from "vitest";
import { parseCVText } from "../src";
import { respace } from "../src/extract-pdf";
import { knownHeading, weakHeading } from "../src/headings";
import { linesFromPages, type Item } from "../src/layout";

/** A line of text on a page 595 points wide: `row` counts down from the top. */
const at = (row: number, x: number, str: string, size = 10): Item => ({ str, x, y: 800 - row * 14, width: str.length * size * 0.5, size, font: "f1" });

describe("reading order", () => {
  it("reads two columns one after the other, not row by row", () => {
    const left = ["SKILLS", "Python, SQL", "React, Django", "LANGUAGES", "Khmer", "English", "EDUCATION", "Royal University", "2021 - 2025"];
    const right = ["EXPERIENCE", "Teaching Assistant", "Royal University of Phnom Penh", "Apr 2025 - Apr 2026", "Supported the programming course", "PROJECTS", "Khmer OCR", "Text recognition for Khmer", "Web apps"];
    const items = [at(0, 40, "Dara Sok", 24), ...left.map((text, i) => at(i + 3, 40, text)), ...right.map((text, i) => at(i + 3, 230, text))];
    const { lines } = linesFromPages([{ width: 595, items }]);
    expect(lines.map((l) => l.text)).toEqual(["Dara Sok", ...left, ...right]);
    expect(lines.every((l) => !l.right)).toBe(true);
  });

  it("keeps a small table together: each label with its value", () => {
    const table = [
      ["Programming", "Python, SQL, JavaScript"],
      ["Web", "React, Django, Flutter"],
      ["Data", "PostgreSQL, MySQL"],
      ["Tools", "Git, Linux"],
      ["Design", "Figma"],
    ];
    const items = [at(0, 40, "SKILLS"), ...table.flatMap(([label, value], i) => [at(i + 1, 40, label!), at(i + 1, 200, value!)])];
    const { lines } = linesFromPages([{ width: 595, items }]);
    expect(lines.slice(1).map((l) => [l.text, l.right])).toEqual(table);
  });

  it("keeps dates set to the right of each entry on the entry's own line", () => {
    const jobs = ["Accountant", "Cashier", "Intern", "Volunteer", "Tutor", "Assistant"];
    const items = jobs.flatMap((job, i) => [at(i * 2, 40, job), at(i * 2, 470, `${2015 + i} - ${2016 + i}`), at(i * 2 + 1, 40, "Acme Trading, Phnom Penh")]);
    const { lines } = linesFromPages([{ width: 595, items }]);
    expect(lines.filter((l) => l.right).map((l) => l.text)).toEqual(jobs);
  });

  it("carries a sidebar over the page without letting it interrupt the main text", () => {
    const side = (n: number) => Array.from({ length: 8 }, (_, i) => at(i, 40, i === 0 && n === 1 ? "SKILLS" : `Skill ${n}.${i}`));
    const main = (n: number) => Array.from({ length: 8 }, (_, i) => at(i, 230, i === 0 && n === 1 ? "EXPERIENCE" : `Work line ${n}.${i} goes on for a while`));
    const { lines } = linesFromPages([
      { width: 595, items: [...side(1), ...main(1)] },
      { width: 595, items: main(2) },
    ]);
    const texts = lines.map((l) => l.text);
    expect(texts.indexOf("Work line 2.0 goes on for a while")).toBe(texts.indexOf("Work line 1.7 goes on for a while") + 1);
    expect(texts.slice(0, 8)).toEqual(side(1).map((i) => i.str));
  });
});

describe("letter-spaced text", () => {
  it("gets its real word breaks back from what the page draws", () => {
    expect(respace("D ATA S C I E N C E & E N G I N E E R I N G", "Dara SokDATA SCIENCE & ENGINEERINGdara@example.com")).toBe("DATA SCIENCE & ENGINEERING");
    expect(respace("S O P H E A C H A N", "SOPHEA CHANSenior Product Manager")).toBe("SOPHEA CHAN");
    expect(respace("PROJ EC TS", "SKILLSPROJECTSEDUCATION")).toBe("PROJECTS");
  });

  it("leaves real words alone when the page writes no spaces at all", () => {
    expect(respace("DATA SCIENCE", "DaraSokDATASCIENCE")).toBeNull();
    expect(respace("NOT THERE", "something else")).toBeNull();
  });

  it("still names the section when capitals arrive broken or run together", () => {
    expect(knownHeading("PROJ EC TS")).toBe("projects");
    expect(knownHeading("E DUC AT ION")).toBe("education");
    expect(knownHeading("WORKEXPERIENCE")).toBe("experiences");
    expect(knownHeading("Pro jects")).toBeNull();
  });
});

describe("words that are only sometimes a section title", () => {
  const cv = (label: string) =>
    parseCVText(["Dara Sok", "Accountant", "", "SKILLS", label, "Mentoring, Coaching", "", "EDUCATION", "Royal University of Phnom Penh\t2015 - 2019", "Bachelor of Accounting"].join("\n"));

  it("treats them as a label inside the section when they are not set like a title", () => {
    expect(weakHeading("Leadership")).toBe("experiences");
    const read = cv("Leadership");
    expect(read.skills).toMatchObject([{ category: "Leadership", skills: [{ name: "Mentoring" }, { name: "Coaching" }] }]);
    expect(read.experiences).toEqual([]);
  });

  it("treats them as a title when they are set like the other titles", () => {
    expect(cv("LEADERSHIP").skills).toEqual([]);
  });
});

describe("what goes where", () => {
  it("never files a date or a sentence under skills", () => {
    const read = parseCVText(["Dara Sok", "", "SKILLS", "Python, SQL, Apr 2025 – Apr 2026, 2023 – 2024", "I have worked with many different tools over the last few years"].join("\n"));
    expect(read.skills.flatMap((g) => g.skills.map((s) => s.name))).toEqual(["Python", "SQL"]);
  });

  it("does not show text without a job title or employer as a blank job", () => {
    const read = parseCVText(["Dara Sok", "", "EXPERIENCE", "I have helped out in the family shop since I was young, serving customers and keeping the accounts in order."].join("\n"));
    expect(read.experiences).toEqual([]);
    expect(read.unplaced.join(" ")).toContain("family shop");
  });

  it("takes the address for the location even when it comes before the job title", () => {
    const read = parseCVText(["Dara Sok", "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh", "DATA SCIENCE & ENGINEERING", "dara@example.com"].join("\n"));
    expect(read.personal).toMatchObject({ fullName: "Dara Sok", headline: "DATA SCIENCE & ENGINEERING", location: "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh" });
  });
});
