import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type IRunOptions,
} from "docx";
import { formatDateRange, formatPartialDate, type CVDocument, type SectionKey } from "@thaflow/cv-core";
import { getCVLabels } from "@thaflow/localization";
import {
  FONT_OPTIONS,
  contactLines,
  getTemplate,
  getVisibleSections,
  parseDescription,
  resolveAppearance,
  type CVTemplate,
} from "@thaflow/template-engine";

/** Font used for Khmer script runs when the chosen font has no Khmer glyphs. */
const KHMER_FALLBACK_FONT = "Noto Sans Khmer";
const KHMER_FONTS = new Set(["Noto Sans Khmer", "Kantumruy Pro", "Battambang"]);

// A4 text width in twips with 0.75in (1080 twip) margins: 11906 - 2 * 1080.
const TEXT_WIDTH = 9746;

interface Style {
  latinFont: string;
  khmerFont: string;
  headingFont: string;
  color: string;
  muted: string;
  text: string;
  /** Half-points. */
  size: number;
  center: boolean;
}

function styleFor(cv: CVDocument, template: CVTemplate): Style {
  const look = resolveAppearance(template, cv.appearance);
  const docxFont = (key: string) => FONT_OPTIONS.find((f) => f.key === key)?.docxFont ?? "Arial";
  const body = docxFont(look.bodyFont);
  return {
    latinFont: body,
    khmerFont: KHMER_FONTS.has(body) ? body : KHMER_FALLBACK_FONT,
    headingFont: docxFont(look.headingFont),
    color: look.primary.replace("#", ""),
    muted: template.colors.muted.replace("#", ""),
    text: template.colors.text.replace("#", ""),
    size: Math.round(template.typography.baseFontSize * 2) + 1,
    center: template.style.headerAlign === "center",
  };
}

/**
 * Word picks the font per script: `ascii`/`hAnsi` for Latin, `cs` for complex
 * scripts such as Khmer. Setting both keeps mixed Khmer/English text readable
 * even when the Latin font has no Khmer glyphs.
 */
function run(style: Style, text: string, options: Partial<IRunOptions> & { heading?: boolean } = {}): TextRun {
  const { heading, ...rest } = options;
  const latin = heading ? style.headingFont : style.latinFont;
  return new TextRun({
    text,
    font: { ascii: latin, hAnsi: latin, cs: style.khmerFont, eastAsia: style.khmerFont },
    size: style.size,
    sizeComplexScript: style.size,
    color: style.text,
    ...rest,
  } as IRunOptions);
}

const join = (parts: (string | undefined)[], sep = " · ") => parts.filter((p) => p?.trim()).join(sep);

function heading(style: Style, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: style.color, space: 2 } },
    children: [run(style, text, { heading: true, bold: true, boldComplexScript: true, color: style.color, size: style.size + 3, sizeComplexScript: style.size + 3 })],
  });
}

function entryHead(style: Style, title: string, date: string): Paragraph {
  const children = [run(style, title, { bold: true, boldComplexScript: true })];
  if (date) children.push(run(style, `\t${date}`, { color: style.muted }));
  return new Paragraph({
    spacing: { before: 120 },
    keepNext: true,
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
    children,
  });
}

function textParagraphs(style: Style, text: string | undefined, extraBullets: string[] = []): Paragraph[] {
  const { paragraphs, bullets } = parseDescription(text);
  const out = paragraphs.map((p) => new Paragraph({ spacing: { before: 40 }, children: [run(style, p)] }));
  for (const b of [...bullets, ...extraBullets.map((x) => x.trim()).filter(Boolean)]) {
    out.push(new Paragraph({ bullet: { level: 0 }, children: [run(style, b)] }));
  }
  return out;
}

function muted(style: Style, text: string, italics = false): Paragraph {
  return new Paragraph({ children: [run(style, text, { color: style.muted, italics })] });
}

function sectionBody(cv: CVDocument, style: Style, key: SectionKey): Paragraph[] {
  const lang = cv.metadata.language;
  const labels = getCVLabels(lang);
  const italics = lang !== "km"; // Khmer has no italic tradition; synthetic slanting hurts legibility.
  const out: Paragraph[] = [];
  const labelled = (label: string, value: string) =>
    new Paragraph({
      spacing: { before: 40 },
      children: [run(style, `${label}: `, { bold: true, boldComplexScript: true }), run(style, value)],
    });

  switch (key) {
    case "summary":
      out.push(...textParagraphs(style, cv.summary));
      break;
    case "experiences":
      for (const e of cv.experiences) {
        out.push(entryHead(style, e.position || e.company, formatDateRange(e.startDate, e.endDate, e.isCurrent, lang)));
        const sub = join([e.position ? e.company : "", e.location]);
        if (sub) out.push(muted(style, sub, italics));
        out.push(...textParagraphs(style, e.description, e.achievements));
        if (e.technologies.length) out.push(muted(style, `${labels.technologies}: ${e.technologies.join(", ")}`));
      }
      break;
    case "education":
      for (const e of cv.education) {
        out.push(
          entryHead(style, join([e.degree, e.fieldOfStudy], ", ") || e.institution, formatDateRange(e.startDate, e.endDate, false, lang)),
        );
        const sub = join([e.degree || e.fieldOfStudy ? e.institution : "", e.location]);
        if (sub) out.push(muted(style, sub, italics));
        out.push(...textParagraphs(style, e.description, e.achievements));
      }
      break;
    case "skills":
      for (const g of cv.skills.filter((g) => g.skills.length > 0)) {
        const names = g.skills.map((s) => s.name).join(", ");
        out.push(g.category ? labelled(g.category, names) : new Paragraph({ spacing: { before: 40 }, children: [run(style, names)] }));
      }
      break;
    case "projects":
      for (const p of cv.projects) {
        out.push(entryHead(style, p.name, formatDateRange(p.startDate, p.endDate, false, lang)));
        const sub = join([p.role, p.url?.replace(/^https?:\/\//i, "")]);
        if (sub) out.push(muted(style, sub, italics));
        out.push(...textParagraphs(style, p.description));
        if (p.technologies.length) out.push(muted(style, `${labels.technologies}: ${p.technologies.join(", ")}`));
      }
      break;
    case "certifications":
      for (const c of cv.certifications) {
        out.push(entryHead(style, c.name, formatPartialDate(c.date, lang)));
        if (c.issuer) out.push(muted(style, c.issuer, italics));
      }
      break;
    case "languages":
      for (const l of cv.languages) {
        out.push(l.proficiency ? labelled(l.name, l.proficiency) : new Paragraph({ spacing: { before: 40 }, children: [run(style, l.name)] }));
      }
      break;
    case "awards":
      for (const a of cv.awards) {
        out.push(entryHead(style, a.title, formatPartialDate(a.date, lang)));
        if (a.issuer) out.push(muted(style, a.issuer, italics));
        out.push(...textParagraphs(style, a.description));
      }
      break;
    case "references":
      for (const r of cv.references) {
        out.push(entryHead(style, r.name, ""));
        const sub = join([r.position, r.company]);
        if (sub) out.push(muted(style, sub, italics));
        const contact = join([r.email, r.phone]);
        if (contact) out.push(new Paragraph({ children: [run(style, contact)] }));
      }
      break;
    case "customSections":
      break;
  }
  return out;
}

/**
 * Build an editable Word document from the same structured CV data the HTML
 * templates use. This is its own renderer (real headings, paragraphs and
 * bullets), not a conversion of the PDF. Two-column templates are flattened to
 * one column so the result stays easy to edit in Word.
 */
export function buildDocx(cv: CVDocument, template: CVTemplate = getTemplate(cv.appearance.templateId)): Document {
  const style = styleFor(cv, template);
  const labels = getCVLabels(cv.metadata.language);
  const alignment = style.center ? AlignmentType.CENTER : AlignmentType.LEFT;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment,
      spacing: { after: 60 },
      children: [
        run(style, cv.personal.fullName || " ", {
          heading: true,
          bold: true,
          boldComplexScript: true,
          color: style.color,
          size: style.size * 2 + 6,
          sizeComplexScript: style.size * 2 + 6,
        }),
      ],
    }),
  );
  if (cv.personal.headline) {
    children.push(new Paragraph({ alignment, children: [run(style, cv.personal.headline, { color: style.muted, size: style.size + 3, sizeComplexScript: style.size + 3 })] }));
  }
  const contact = contactLines(cv).map((l) => l.value).join("  |  ");
  if (contact) children.push(new Paragraph({ alignment, spacing: { before: 60 }, children: [run(style, contact, { color: style.muted })] }));

  for (const key of getVisibleSections(cv, template)) {
    if (key === "customSections") {
      for (const section of cv.customSections.filter((s) => s.items.length > 0)) {
        children.push(heading(style, section.title || labels.sections.customSections));
        for (const item of section.items) {
          children.push(entryHead(style, item.title, formatPartialDate(item.date, cv.metadata.language)));
          if (item.subtitle) children.push(muted(style, item.subtitle));
          children.push(...textParagraphs(style, item.description));
        }
      }
      continue;
    }
    children.push(heading(style, labels.sections[key]), ...sectionBody(cv, style, key));
  }

  return new Document({
    creator: "ThaFlow CV",
    title: cv.metadata.title,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });
}

export async function generateDOCX(cv: CVDocument, template?: CVTemplate): Promise<Blob> {
  return Packer.toBlob(buildDocx(cv, template));
}

export async function generateDOCXBuffer(cv: CVDocument, template?: CVTemplate): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toBuffer(buildDocx(cv, template)));
}
