import { describe, expect, it } from "vitest";
import { generateDOCXBuffer } from "@thaflow/export-engine";
import { getTemplate } from "@thaflow/template-engine";
import { khmerCV, sampleCV } from "../../cv-core/test/fixtures";
import { ImportError, createCVFromImport, detectImportSource, findDates, importCVBytes, isImportEmpty, parseCVText } from "../src";

const ENGLISH = `
Sok Dara
Accountant
dara@example.com | +855 12 345 678 | Phnom Penh, Cambodia
Date of birth: 12 March 1996
Nationality: Khmer

PROFESSIONAL SUMMARY
Accountant with three years of experience in monthly reporting. My experience covers tax and payroll.

WORK EXPERIENCE
Senior Accountant at Acme Trading Co., Ltd.\tJan 2022 - Present
- Prepare monthly financial reports
- Manage accounts payable for 40 suppliers
Technologies: QuickBooks, Excel

Junior Accountant — Mekong Foods
03/2019 – 12/2021
Recorded daily transactions and reconciled bank statements.

EDUCATION
Royal University of Phnom Penh\t2015 - 2019
Bachelor of Business Administration in Accounting

SKILLS
Software: Excel, QuickBooks, Word
Tax filing, Payroll; Bank reconciliation

LANGUAGES
Khmer (Native), English - Fluent

CERTIFICATIONS
Certified Accounting Technician\tApr 2020
ACCA

HOBBIES
Football
`;

describe("recognizing a CV from text", () => {
  const cv = parseCVText(ENGLISH);

  it("reads personal details and drops private data", () => {
    expect(cv.personal).toMatchObject({ fullName: "Sok Dara", headline: "Accountant", email: "dara@example.com", phone: "+855 12 345 678", location: "Phnom Penh, Cambodia" });
    // Ids are random and can contain any digits, so they are left out of the search.
    expect(JSON.stringify(cv, (key, value) => (key === "id" ? undefined : value))).not.toMatch(/1996|Nationality/);
    expect(cv.language).toBe("en");
  });

  it("splits jobs and reads titles, companies, dates and bullets", () => {
    expect(cv.experiences).toHaveLength(2);
    expect(cv.experiences[0]).toMatchObject({ position: "Senior Accountant", company: "Acme Trading Co., Ltd.", startDate: "2022-01", isCurrent: true, technologies: ["QuickBooks", "Excel"] });
    expect(cv.experiences[0]!.endDate).toBeUndefined();
    expect(cv.experiences[0]!.description).toBe("- Prepare monthly financial reports\n- Manage accounts payable for 40 suppliers");
    expect(cv.experiences[1]).toMatchObject({ position: "Junior Accountant", company: "Mekong Foods", startDate: "2019-03", endDate: "2021-12", isCurrent: false });
    expect(cv.experiences[1]!.description).toContain("reconciled bank statements");
  });

  it("reads education, skills, languages and certificates", () => {
    expect(cv.education).toHaveLength(1);
    expect(cv.education[0]).toMatchObject({ institution: "Royal University of Phnom Penh", degree: "Bachelor of Business Administration", fieldOfStudy: "Accounting", startDate: "2015", endDate: "2019" });
    expect(cv.skills.find((g) => g.category === "Software")?.skills.map((s) => s.name)).toEqual(["Excel", "QuickBooks", "Word"]);
    expect(cv.skills.find((g) => g.category === "")?.skills.map((s) => s.name)).toEqual(["Tax filing", "Payroll", "Bank reconciliation"]);
    expect(cv.languages.map((l) => [l.name, l.proficiency])).toEqual([["Khmer", "Native"], ["English", "Fluent"]]);
    expect(cv.certifications[0]).toMatchObject({ name: "Certified Accounting Technician", issuer: "ACCA", date: "2020-04" });
  });

  it("does not take a sentence for a heading, and keeps what it cannot place", () => {
    expect(cv.summary).toContain("My experience covers tax and payroll.");
    expect(cv.unplaced).toContain("Football");
    expect(cv.projects).toEqual([]);
  });

  it("gives every item its own id", () => {
    const ids = [...cv.experiences, ...cv.education, ...cv.skills, ...cv.skills.flatMap((g) => g.skills), ...cv.languages].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reads a Khmer CV", () => {
    const km = parseCVText(`
សុខ ដារ៉ា
គណនេយ្យករ
dara@example.com · 012 345 678 · ភ្នំពេញ
ភេទ៖ ប្រុស

បទពិសោធន៍ការងារ
គណនេយ្យករ\tមករា ២០២២ – បច្ចុប្បន្ន
ក្រុមហ៊ុន អេស៊ីអឹម · ភ្នំពេញ
រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុប្រចាំខែ។

ការសិក្សា
បរិញ្ញាបត្រ, គណនេយ្យ\t២០១៥ – ២០១៩
សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ

ជំនាញ
Excel, QuickBooks

ភាសា
ខ្មែរ៖ ភាសាកំណើត
`);
    expect(km.language).toBe("km");
    expect(km.personal).toMatchObject({ fullName: "សុខ ដារ៉ា", headline: "គណនេយ្យករ", phone: "012 345 678", location: "ភ្នំពេញ" });
    expect(JSON.stringify(km)).not.toContain("ប្រុស");
    expect(km.experiences[0]).toMatchObject({ position: "គណនេយ្យករ", company: "ក្រុមហ៊ុន អេស៊ីអឹម", location: "ភ្នំពេញ", startDate: "2022-01", isCurrent: true });
    expect(km.education[0]).toMatchObject({ institution: "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ", degree: "បរិញ្ញាបត្រ", fieldOfStudy: "គណនេយ្យ", startDate: "2015", endDate: "2019" });
    expect(km.skills[0]!.skills.map((s) => s.name)).toEqual(["Excel", "QuickBooks"]);
    expect(km.languages[0]).toMatchObject({ name: "ខ្មែរ", proficiency: "ភាសាកំណើត" });
  });

  it("invents nothing when the text is not a CV", () => {
    const nothing = parseCVText("Meeting notes\nWe discussed the budget for next year and agreed to meet again.");
    expect(nothing.experiences).toEqual([]);
    expect(nothing.education).toEqual([]);
    expect(nothing.skills).toEqual([]);
    expect(isImportEmpty(parseCVText("12345\n......"))).toBe(true);
  });
});

describe("dates", () => {
  it("parses common forms into YYYY or YYYY-MM", () => {
    expect(findDates("Jan 2022 - Jun 2024")).toMatchObject({ start: "2022-01", end: "2024-06", isCurrent: false, range: true });
    expect(findDates("January 2022 to Present")).toMatchObject({ start: "2022-01", isCurrent: true });
    expect(findDates("2020–2023")).toMatchObject({ start: "2020", end: "2023" });
    expect(findDates("03/2021 - 11/2022")).toMatchObject({ start: "2021-03", end: "2022-11" });
    expect(findDates("2021 - now")).toMatchObject({ start: "2021", isCurrent: true });
    expect(findDates("មីនា ២០២១ – បច្ចុប្បន្ន")).toMatchObject({ start: "2021-03", isCurrent: true });
    expect(findDates("Graduated 2019")).toMatchObject({ end: "2019", range: false, rest: "Graduated" });
    expect(findDates("Managed 2000 accounts")).toMatchObject({ end: "2000" }); // a lone year is only used on a line of its own
    expect(findDates("no dates here")).toBeNull();
  });
});

describe("Word documents", () => {
  it("round-trips a CV exported by this app", async () => {
    const cv = sampleCV();
    cv.personal.headline = "Frontend Developer";
    const { source, data, warnings } = await importCVBytes(await generateDOCXBuffer(cv, getTemplate("ats")));
    expect(source).toBe("docx");
    expect(warnings).toEqual([]);
    expect(data.personal).toMatchObject({ fullName: "Sok Dara", email: "dara@example.com", phone: "+855 12 345 678" });
    expect(data.experiences).toHaveLength(1);
    expect(data.experiences[0]).toMatchObject({ position: "Frontend Developer", company: "Acme Co", startDate: "2022-01", endDate: "2024-06" });
    expect(data.experiences[0]!.description).toContain("Built and maintained customer-facing web applications");
    expect(data.education[0]).toMatchObject({ institution: "Royal University of Phnom Penh", endDate: "2021" });
    expect(data.skills.flatMap((g) => g.skills.map((s) => s.name))).toEqual(expect.arrayContaining(["React", "CSS"]));
    const rebuilt = createCVFromImport(data);
    expect(rebuilt.personal.fullName).toBe("Sok Dara");
    expect(rebuilt.metadata.language).toBe("en");
  });

  it("round-trips a Khmer CV", async () => {
    const { data } = await importCVBytes(await generateDOCXBuffer(khmerCV(), getTemplate("minimal")));
    expect(data.language).toBe("km");
    expect(data.personal.fullName).toBe("សុខ ដារ៉ា");
    expect(data.experiences[0]).toMatchObject({ position: "អ្នកអភិវឌ្ឍន៍ Frontend", startDate: "2022-01", endDate: "2024-06" });
    expect(data.summary).toContain("បទពិសោធន៍បីឆ្នាំ");
  });

  it("reads every template's Word export", async () => {
    const { templates } = await import("@thaflow/template-engine");
    for (const template of templates) {
      const { data } = await importCVBytes(await generateDOCXBuffer(sampleCV(), template));
      expect(data.personal.fullName, template.id).toBe("Sok Dara");
      expect(data.experiences.length, template.id).toBe(1);
      expect(data.experiences[0]!.position, template.id).toBe("Frontend Developer");
    }
  });
});

describe("refusing files", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);
  const code = async (data: Uint8Array) => importCVBytes(data).then(() => "ok", (e) => (e instanceof ImportError ? e.code : String(e)));

  it("reports why", async () => {
    expect(await code(bytes("just some plain text, not a document at all"))).toBe("unsupported-type");
    expect(await code(new Uint8Array(3))).toBe("corrupt");
    expect(await code(bytes("PK\u0003\u0004 this is not really a zip archive"))).toBe("corrupt");
    expect(await code(bytes("%PDF-1.7\nthis is not really a pdf file, only a header"))).toBe("corrupt");
    const docx = await generateDOCXBuffer(sampleCV());
    expect(await code(docx.subarray(0, Math.floor(docx.length / 2)))).toBe("corrupt");
  });

  it("checks the file kind by name and type", () => {
    expect(detectImportSource({ name: "cv.PDF" })).toBe("pdf");
    expect(detectImportSource({ name: "cv.docx" })).toBe("docx");
    expect(detectImportSource({ name: "x", type: "application/pdf" })).toBe("pdf");
    expect(detectImportSource({ name: "cv.doc" })).toBeNull();
    expect(detectImportSource({ name: "notes.txt", type: "text/plain" })).toBeNull();
  });
});
