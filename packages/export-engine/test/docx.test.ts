import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";
import { FONT_INFO, getTemplate, resolveAppearance, templates, type CVTemplate } from "@thaflow/template-engine";
import { khmerCV, sampleCV } from "../../cv-core/test/fixtures";
import { TINY_PHOTO, fullEnglishCV, fullKhmerCV, mixedCV, stressCV } from "../../template-engine/test/fixtures";
import { fileNameFor, generateDOCXBuffer } from "../src";

/** Minimal ZIP reader: the entry names, and one entry inflated. */
function zipEntries(zip: Uint8Array): Map<string, () => string> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entries = new Map<string, () => string>();
  // Walk the central directory, which has the true sizes even when the local headers do not.
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("not a zip file");
  let at = view.getUint32(end + 16, true);
  const total = view.getUint16(end + 10, true);
  for (let i = 0; i < total; i++) {
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLen));
    entries.set(name, () => {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = zip.subarray(start, start + size);
      return method === 0 ? new TextDecoder().decode(data) : inflateRawSync(data).toString("utf8");
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function documentXml(cv: CVDocument, template?: CVTemplate): Promise<string> {
  const read = zipEntries(await generateDOCXBuffer(cv, template)).get("word/document.xml");
  if (!read) throw new Error("word/document.xml not found");
  return read();
}

const KHMER_FONTS = ["Noto Sans Khmer", "Noto Serif Khmer", "Kantumruy Pro", "Battambang", "Hanuman", "Moul"];
const KHMER = /[ក-៿]/;
/** Each run of the document as [properties xml, text]. */
const runs = (xml: string) =>
  [...xml.matchAll(/<w:r>(?:<w:rPr>(.*?)<\/w:rPr>)?(.*?)<\/w:r>/g)].map((m) => ({
    properties: m[1] ?? "",
    text: [...(m[2] ?? "").matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(""),
  }));

describe("DOCX export", () => {
  it("produces a Word document containing the CV text as editable runs", async () => {
    const xml = await documentXml(sampleCV());
    expect(xml).toContain("Sok Dara");
    expect(xml).toContain("Frontend Developer");
    expect(xml).toContain("Jan 2022 – Jun 2024");
    expect(xml).toContain("Migrated the checkout flow to TypeScript");
    expect(xml).toContain("Experience");
  });

  it("writes Khmer text with a Khmer complex-script font", async () => {
    const xml = await documentXml(khmerCV());
    expect(xml).toContain("សុខ ដារ៉ា");
    expect(xml).toContain("បទពិសោធន៍ការងារ");
    expect(xml).toMatch(/w:cs="Noto Sans Khmer"/);
  });

  it("escapes markup in user content", async () => {
    const cv = sampleCV();
    cv.summary = 'Uses <script>alert("x")</script> & more';
    const xml = await documentXml(cv);
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
  });

  it("builds safe file names", () => {
    expect(fileNameFor(sampleCV())).toBe("Sok-Dara");
    expect(fileNameFor(khmerCV())).toBe("សុខ-ដារ៉ា");
    const cv = sampleCV();
    cv.personal.fullName = "../..\\evil:name";
    expect(fileNameFor(cv)).not.toMatch(/[\\/:]/);
  });
});

describe("DOCX export for every template", () => {
  const cases: [string, () => CVDocument][] = [
    ["English", () => fullEnglishCV({ photo: TINY_PHOTO })],
    ["Khmer", () => fullKhmerCV({ photo: TINY_PHOTO })],
    ["mixed Khmer/English", () => mixedCV()],
    ["awkward content", () => stressCV()],
    ["an empty CV", () => createEmptyCV()],
  ];

  for (const [label, make] of cases) {
    it(`generates a document for all ${templates.length} templates: ${label}`, async () => {
      for (const template of templates) {
        const cv = make();
        const entries = zipEntries(await generateDOCXBuffer(cv, template));
        expect([...entries.keys()], template.id).toContain("word/document.xml");
        expect([...entries.keys()], template.id).toContain("word/numbering.xml");
        const xml = entries.get("word/document.xml")!();
        expect(xml.startsWith("<?xml"), template.id).toBe(true);
        if (cv.personal.fullName) expect(xml, template.id).toContain(cv.personal.fullName.replace(/&/g, "&amp;"));
      }
    });
  }

  it("contains every section of the CV, whatever the template", async () => {
    for (const template of templates) {
      const xml = await documentXml(fullEnglishCV(), template);
      for (const text of [
        "Sophea Chan",
        "sophea.chan@example.com",
        "Product manager with eight years",
        "Tonle Digital",
        "Senior Product Manager",
        "Mar 2021 – Present",
        "Cut new-account sign-up time",
        "Technologies: Figma, SQL, Amplitude",
        "Royal University of Phnom Penh",
        "Roadmapping, User research",
        "QR payments",
        "Scrum Alliance",
        "Fluent",
        "Employee of the Year",
        "Vibol Kim",
        "Volunteering",
        "Volunteer teacher",
      ]) {
        expect(xml, `${template.id}: ${text}`).toContain(text);
      }
    }
  });

  it("gives every run a Khmer complex-script font, in both languages", async () => {
    for (const template of templates) {
      for (const cv of [fullEnglishCV(), fullKhmerCV(), mixedCV()]) {
        const xml = await documentXml(cv, template);
        const complexScriptFonts = new Set([...xml.matchAll(/w:cs="([^"]+)"/g)].map((m) => m[1]!));
        expect(complexScriptFonts.size, template.id).toBeGreaterThan(0);
        for (const font of complexScriptFonts) expect(KHMER_FONTS, `${template.id}: ${font}`).toContain(font);
        // No run is left on Word's default font.
        for (const r of runs(xml)) {
          if (r.text.trim()) expect(r.properties, `${template.id}: "${r.text}"`).toContain("w:cs=");
        }
      }
    }
  });

  it("uses each template's own fonts, for Latin and for Khmer", async () => {
    for (const template of templates) {
      const xml = await documentXml(fullKhmerCV(), template);
      const body = FONT_INFO[template.typography.bodyFont].docx;
      const heading = FONT_INFO[template.typography.headingFont].docx;
      expect(xml, template.id).toContain(`w:ascii="${body.latin}"`);
      expect(xml, template.id).toContain(`w:cs="${body.khmer}"`);
      expect(xml, template.id).toContain(`w:cs="${heading.khmer}"`);
    }
    // Khmer-first designs keep their Khmer display face in Word.
    expect(await documentXml(fullKhmerCV(), getTemplate("angkor"))).toContain('w:cs="Moul"');
    expect(await documentXml(fullKhmerCV(), getTemplate("kulen"))).toContain('w:cs="Noto Serif Khmer"');
  });

  it("never slants, letter-spaces or capitalises Khmer runs", async () => {
    for (const template of templates) {
      for (const cv of [fullKhmerCV(), mixedCV()]) {
        for (const r of runs(await documentXml(cv, template))) {
          if (!KHMER.test(r.text)) continue;
          expect(r.properties, `${template.id}: "${r.text}"`).not.toMatch(/<w:i\/>|<w:i w:val="(true|1)"/);
          expect(r.properties, `${template.id}: "${r.text}"`).not.toMatch(/<w:iCs\/>|<w:iCs w:val="(true|1)"/);
          expect(r.properties, `${template.id}: "${r.text}"`).not.toContain("<w:spacing");
          expect(r.properties, `${template.id}: "${r.text}"`).not.toMatch(/<w:caps\/>|<w:caps w:val="(true|1)"/);
        }
      }
    }
    // Latin subtitles are still italic where the template asks for it.
    expect(await documentXml(fullEnglishCV(), getTemplate("corporate"))).toMatch(/<w:i\/>|<w:i w:val="(true|1)"/);
    expect(await documentXml(fullEnglishCV(), getTemplate("minimal"))).not.toMatch(/<w:i\/>|<w:i w:val="(true|1)"/);
  });

  it("carries the person's accent colour and font into every template", async () => {
    for (const template of templates) {
      const cv = fullEnglishCV();
      cv.appearance.primaryColor = "#9a3412";
      cv.appearance.fontFamily = "kantumruy";
      const xml = await documentXml(cv, template);
      expect(xml, template.id).toContain("9A3412");
      expect(xml, template.id).toContain('w:ascii="Kantumruy Pro"');
      const look = resolveAppearance(template, cv.appearance);
      expect(look.primary).toBe("#9a3412");
    }
  });

  it("reflects header alignment, heading treatment and date placement", async () => {
    const xml = async (id: string) => documentXml(fullEnglishCV(), getTemplate(id));
    // Centred headers.
    expect(await xml("corporate")).toMatch(/<w:jc w:val="center"\/>/);
    expect(await xml("minimal")).not.toMatch(/<w:jc w:val="center"\/>/);
    // Ruled headings: below, above, or a bar on the left.
    expect(await xml("minimal")).toContain("<w:bottom ");
    expect(await xml("ink")).toContain("<w:top ");
    expect(await xml("graduate")).toContain("<w:left ");
    expect(await xml("ats")).not.toContain("<w:pBdr>");
    // Numbered headings.
    expect(await xml("index")).toContain("01  ");
    // Dates: right tab, left column, or their own line.
    expect(await xml("minimal")).toMatch(/<w:tab w:val="right"/);
    expect(await xml("ats")).not.toMatch(/<w:tab w:val="right"/);
    expect(await xml("academic")).toMatch(/<w:ind [^>]*w:hanging=/);
    // Uppercase names and headings use Word's own capitals, so the text stays as typed.
    expect(await xml("ink")).toContain("<w:caps/>");
    expect(await xml("ink")).toContain("Sophea Chan");
    // A banner template shades its header paragraphs.
    expect(await xml("tonle")).toContain(`w:fill="${getTemplate("tonle").colors.primary.slice(1)}"`);
    expect(await xml("minimal")).not.toContain("<w:shd ");
  });

  it("leads entries with the organisation where the template does", async () => {
    const corporate = await documentXml(fullEnglishCV(), getTemplate("corporate"));
    const minimal = await documentXml(fullEnglishCV(), getTemplate("minimal"));
    expect(corporate.indexOf("Tonle Digital")).toBeLessThan(corporate.indexOf("Senior Product Manager · Phnom Penh"));
    expect(minimal).toContain("Tonle Digital · Phnom Penh");
  });

  it("embeds the photo only for templates with a photo slot", async () => {
    for (const template of templates) {
      const withPhoto = zipEntries(await generateDOCXBuffer(fullEnglishCV({ photo: TINY_PHOTO }), template));
      const hasMedia = [...withPhoto.keys()].some((name) => name.startsWith("word/media/"));
      expect(hasMedia, template.id).toBe(template.layout.photo !== "none");
    }
    const without = zipEntries(await generateDOCXBuffer(fullEnglishCV(), getTemplate("modern")));
    expect([...without.keys()].some((name) => name.startsWith("word/media/"))).toBe(false);
    // A photo Word cannot read, or a remote one, is left out rather than breaking the export.
    for (const photo of ["data:image/webp;base64,UklGRg==", "https://example.com/me.png"]) {
      const entries = zipEntries(await generateDOCXBuffer(fullEnglishCV({ photo }), getTemplate("modern")));
      expect([...entries.keys()].some((name) => name.startsWith("word/media/"))).toBe(false);
    }
  });

  it("uses the template's bullet character", async () => {
    const numbering = async (id: string) => zipEntries(await generateDOCXBuffer(fullEnglishCV(), getTemplate(id))).get("word/numbering.xml")!();
    expect(await numbering("minimal")).toContain('w:val="•"');
    expect(await numbering("margin")).toContain('w:val="–"');
    expect(await numbering("technical")).toContain('w:val="▪"');
  });
});
