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

/** A CV typed as a form, the way most are in Cambodia: a page title, then "label ⇥ : value" on every line. */
const FORM = `
CURRICULUM VITAE
Name\t: SIM SREYNETH
Current Address\t: Group 8, Village 3, Sangkat 1, Sihanoukville
Mobile Number\t: +855 12 345 678
Email\t: sreyneth@example.com
Apply for\t: Sales and Cashier

PERSONAL DATA
Sex\t: Female
Date of birth\t: 19 February 2005
Place of birth\t: Preah Sihanouk Province
Nationality\t: Cambodian
Marital Status\t: Single
Health\t: Good

EDUCATION BACKGROUND
2020-2023\t: Sihanoukville High School

WORK EXPERIENCES
2023-2024\t: Cashier at ABA Bank

LANGUAGES
Khmer\t: Mother Tongue
English\t: Good
`;

const KHMER_FORM = `
ព្រះរាជាណាចក្រកម្ពុជា
ជាតិ សាសនា ព្រះមហាក្សត្រ
ប្រវត្តិរូបសង្ខេប
ព័ត៌មានផ្ទាល់ខ្លួន
ឈ្មោះ\t: លឹម ហ៊ុយសេង
មុខតំណែង\t: បុគ្គលិកលក់
ទូរស័ព្ទ\t: +855 12 345 678
ភេទ\t: ប្រុស
ថ្ងៃខែឆ្នាំកំណើត\t: 25 មីនា 2007
សញ្ជាតិ\t: ខ្មែរ
ស្ថានភាពគ្រួសារ\t: នៅលីវ
អាសយដ្ឋាន\t: ភូមិកណ្តាលលើ ឃុំបន្ទាយដែក ស្រុកកៀនស្វាយ ខេត្តកណ្តាល
ការសិក្សា
2022 – 2025\t: វិទ្យាល័យជ័យវរ្ម័នទី៧
ភាសា
ខ្មែរ\t: ភាសាកំណើត
អង់គ្លេស\t: មូលដ្ឋាន
`;

describe("a CV typed as a form", () => {
  const withoutIds = (value: unknown) => JSON.stringify(value, (key, v) => (key === "id" ? undefined : v));

  it("takes the name and the job from their labelled rows, not from the page title", () => {
    const cv = parseCVText(FORM);
    expect(cv.personal).toEqual({
      fullName: "SIM SREYNETH",
      headline: "Sales and Cashier",
      location: "Group 8, Village 3, Sangkat 1, Sihanoukville",
      phone: "+855 12 345 678",
      email: "sreyneth@example.com",
    });
    expect(withoutIds(cv)).not.toMatch(/curriculum vitae/i);
    expect(cv.unplaced).toEqual([]);
  });

  it("reads each dated row as an entry and each language row with its level", () => {
    const cv = parseCVText(FORM);
    expect(cv.education).toHaveLength(1);
    expect(cv.education[0]).toMatchObject({ institution: "Sihanoukville High School", startDate: "2020", endDate: "2023" });
    expect(cv.experiences).toHaveLength(1);
    expect(cv.experiences[0]).toMatchObject({ position: "Cashier", company: "ABA Bank", startDate: "2023", endDate: "2024" });
    expect(cv.languages.map((l) => [l.name, l.proficiency])).toEqual([["Khmer", "Mother Tongue"], ["English", "Good"]]);
  });

  it("still leaves the personal data out", () => {
    expect(withoutIds(parseCVText(FORM))).not.toMatch(/2005|Female|Single|Sihanouk Province|Cambodian|Sex|Marital|Health/);
    expect(withoutIds(parseCVText(KHMER_FORM))).not.toMatch(/2007|ប្រុស|នៅលីវ|សញ្ជាតិ|ភេទ/);
  });

  it("reads a Khmer sheet headed by the national motto", () => {
    const cv = parseCVText(KHMER_FORM);
    expect(cv.language).toBe("km");
    expect(cv.personal).toEqual({
      fullName: "លឹម ហ៊ុយសេង",
      headline: "បុគ្គលិកលក់",
      phone: "+855 12 345 678",
      location: "ភូមិកណ្តាលលើ ឃុំបន្ទាយដែក ស្រុកកៀនស្វាយ ខេត្តកណ្តាល",
    });
    expect(cv.education[0]).toMatchObject({ institution: "វិទ្យាល័យជ័យវរ្ម័នទី៧", startDate: "2022", endDate: "2025" });
    expect(cv.languages.map((l) => [l.name, l.proficiency])).toEqual([["ខ្មែរ", "ភាសាកំណើត"], ["អង់គ្លេស", "មូលដ្ឋាន"]]);
    // The motto and the title are the page's heading: not the person, not their summary.
    expect(cv.summary).toBe("");
    expect(withoutIds(cv)).not.toMatch(/ព្រះរាជាណាចក្រ|ព្រះមហាក្សត្រ|ប្រវត្តិរូបសង្ខេប/);
  });

  it("keeps a page title only where it is a title: a summary headed that way further down is still read", () => {
    const cv = parseCVText("Sok Dara\nAccountant\ndara@example.com\n\nWORK EXPERIENCE\nAccountant at Acme\t2020 - 2022\n\nប្រវត្តិរូបសង្ខេប\nCareful with numbers and good with people.");
    expect(cv.personal.fullName).toBe("Sok Dara");
    expect(cv.summary).toBe("Careful with numbers and good with people.");
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
      const cv = sampleCV();
      cv.personal = { ...cv.personal, headline: "Web Developer", gender: "male", dateOfBirth: "1999-07-21", placeOfBirth: "Takeo Province", nationality: "Cambodian", maritalStatus: "single" };
      const { data, warnings } = await importCVBytes(await generateDOCXBuffer(cv, template));
      expect(warnings, template.id).toEqual([]);
      expect(data.personal, template.id).toEqual({ fullName: "Sok Dara", headline: "Web Developer", email: "dara@example.com", phone: "+855 12 345 678", location: "Phnom Penh" });
      expect(data.experiences.length, template.id).toBe(1);
      expect(data.experiences[0], template.id).toMatchObject({ position: "Frontend Developer", company: "Acme Co", startDate: "2022-01", endDate: "2024-06" });
      expect(data.education[0], template.id).toMatchObject({ institution: "Royal University of Phnom Penh", endDate: "2021" });
      expect(data.skills.flatMap((g) => g.skills.map((s) => s.name)), template.id).toEqual(["React", "CSS"]);
      // The personal details a template prints are not carried back in, and never end up in another field.
      expect(JSON.stringify(data, (key, value) => (key === "id" ? undefined : value)), template.id).not.toMatch(/1999|Takeo|Cambodian|Single|Male/);
      expect(data.unplaced, template.id).toEqual([]);
    }
  });

  it("reads the Khmer export of the sheets that print everything as rows", async () => {
    for (const id of ["sambor", "chaktomuk", "vihear"]) {
      const cv = khmerCV();
      cv.personal = { ...cv.personal, headline: "អ្នកអភិវឌ្ឍន៍គេហទំព័រ", gender: "male", dateOfBirth: "1999-07-21", nationality: "ខ្មែរ" };
      const { data } = await importCVBytes(await generateDOCXBuffer(cv, getTemplate(id)));
      expect(data.language, id).toBe("km");
      expect(data.personal, id).toEqual({ fullName: "សុខ ដារ៉ា", headline: "អ្នកអភិវឌ្ឍន៍គេហទំព័រ", email: "dara@example.com", phone: "+855 12 345 678", location: "Phnom Penh" });
      expect(data.experiences[0], id).toMatchObject({ position: "អ្នកអភិវឌ្ឍន៍ Frontend", startDate: "2022-01", endDate: "2024-06" });
      expect(data.summary, id).toContain("បទពិសោធន៍បីឆ្នាំ");
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
