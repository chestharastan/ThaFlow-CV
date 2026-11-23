import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  TabStopType,
  TextRun,
  type IBorderOptions,
  type IParagraphOptions,
  type IRunOptions,
} from "docx";
import { formatDateRange, formatPartialDate, type CVDocument, type SectionKey } from "@thaflow/cv-core";
import { getCVLabels } from "@thaflow/localization";
import {
  DENSITY,
  FONT_INFO,
  contactLines,
  contactRows,
  educationLines,
  experienceLines,
  getTemplate,
  getVisibleSections,
  hasKhmer,
  joinParts,
  parseDescription,
  resolveAppearance,
  type CVTemplate,
  type FontKey,
  type HeadingStyle,
  mixColor,
} from "@thaflow/template-engine";

/*
 * Word document renderer. It reads the same CV data and the same template
 * configuration as the HTML renderer, and carries over what Word can express
 * and a person can still edit comfortably: fonts, the accent colour, header
 * alignment, the heading treatment, where dates sit, bullets, spacing, banner
 * fills and the photo. Everything else falls back to a clean single column:
 * two-column templates are flattened, sidebars lose their fill, and monograms,
 * timelines and skill tags become plain text.
 */

const TWIPS_PER_MM = 1440 / 25.4;
const PAGE_WIDTH = 11906; // A4, twips
const PAGE_HEIGHT = 16838;
const BULLETS = "cv-bullets";
const BULLET_CHARS = { disc: "•", dash: "–", square: "▪" } as const;
const CONTACT_SEPARATORS = { space: "    ", dot: "  ·  ", pipe: "  |  ", slash: "  /  " } as const;

interface Fonts {
  latin: string;
  khmer: string;
}

interface Style {
  template: CVTemplate;
  body: Fonts;
  heading: Fonts;
  name: Fonts;
  /** Hex without "#". */
  accent: string;
  text: string;
  muted: string;
  rule: string;
  /** Half-points. */
  size: number;
  /** Text width between the page margins, twips. */
  textWidth: number;
  margin: { x: number; y: number };
  /** Paragraph spacing, twips. */
  gap: { section: number; entry: number };
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
  /** Left indent of entry text when dates sit in a left column, twips (0 otherwise). */
  dateColumn: number;
  /** Synthetic slanting hurts Khmer; italics are Latin-only and only where the template uses them. */
  italics: boolean;
  /** Banner fill behind the header paragraphs, if the template has one. */
  banner: { fill: string; text: string; muted: string } | null;
}

const hex = (color: string) => color.replace("#", "").toUpperCase();
const twips = (mm: number) => Math.round(mm * TWIPS_PER_MM);

function fontsFor(key: FontKey): Fonts {
  return FONT_INFO[key].docx;
}

function styleFor(cv: CVDocument, template: CVTemplate): Style {
  const look = resolveAppearance(template, cv.appearance);
  const { style: design, typography: type, colors } = template;
  const density = DENSITY[design.density];
  const marginX = twips(density.padX + 3);
  const marginY = twips(density.padY + 3);
  const has = (target: (typeof design.accent)[number]) => design.accent.includes(target);
  const khmer = cv.metadata.language === "km";
  // Half-points. Khmer text sets larger than Latin at the same size in Word's fallback fonts.
  const size = Math.round(type.baseFontSize * (khmer ? type.khmerScale : 1) * 2);
  const banner = design.header === "banner";
  return {
    template,
    body: fontsFor(look.bodyFont),
    heading: fontsFor(look.headingFont),
    name: fontsFor(look.nameFont),
    accent: hex(look.primary),
    text: hex(colors.text),
    muted: hex(colors.muted),
    rule: has("rules") ? hex(look.primary) : hex(colors.rule),
    size,
    textWidth: PAGE_WIDTH - 2 * marginX,
    margin: { x: marginX, y: marginY },
    gap: { section: twips(density.gapSection) + 60, entry: twips(density.gapEntry) },
    alignment: design.header === "center" || design.header === "boxed" ? AlignmentType.CENTER : AlignmentType.LEFT,
    // Khmer month names run longer than English ones.
    dateColumn: design.entry === "date-left" ? twips(khmer ? 46 : 38) : 0,
    italics: design.subtitleItalic && !khmer,
    banner: banner
      ? { fill: hex(look.fill.background), text: hex(look.fill.text), muted: hex(look.fill.muted) }
      : null,
  };
}

type RunOptions = Partial<IRunOptions> & { fonts?: Fonts; scale?: number };

/**
 * Word picks the font per script: `ascii`/`hAnsi` for Latin, `cs` for complex
 * scripts such as Khmer. Every run names a Khmer font for `cs`, so Khmer text
 * never lands in a Latin-only face. Sizes and bold are set for both scripts;
 * italics and letter-spacing never reach Khmer.
 */
function run(style: Style, text: string, options: RunOptions = {}): TextRun {
  const { fonts = style.body, scale = 1, bold, italics, characterSpacing, allCaps, ...rest } = options;
  const size = Math.round(style.size * scale);
  const khmer = hasKhmer(text);
  return new TextRun({
    text,
    font: { ascii: fonts.latin, hAnsi: fonts.latin, cs: fonts.khmer, eastAsia: fonts.khmer },
    size,
    sizeComplexScript: size,
    color: style.text,
    // Only written when on, so runs stay free of explicit "off" switches.
    ...(bold ? { bold: true, boldComplexScript: true } : {}),
    ...(italics && !khmer ? { italics: true } : {}),
    ...(allCaps && !khmer ? { allCaps: true } : {}),
    ...(characterSpacing && !khmer ? { characterSpacing } : {}),
    ...(khmer ? { language: { value: "en-US", bidirectional: "km-KH" } } : {}),
    ...rest,
  } as IRunOptions);
}

function border(style: Style, weight: "rule" | "strong" = "rule", color = style.rule): IBorderOptions {
  // Eighths of a point.
  const sizes = { hair: 4, medium: 8, heavy: 16 } as const;
  const base = sizes[style.template.style.rules];
  return { style: BorderStyle.SINGLE, size: weight === "strong" ? Math.round(base * 1.5) : base, color, space: 3 };
}

/** Indent shared by everything that belongs to an entry when dates sit in a left column. */
const entryIndent = (style: Style) => (style.dateColumn ? { indent: { left: style.dateColumn } } : {});

/* ---------- Header ---------- */

function headerParagraphs(cv: CVDocument, style: Style): Paragraph[] {
  const { template } = style;
  const { typography: type, style: design } = template;
  const out: IParagraphOptions[] = [];
  const nameColor = style.banner ? style.banner.text : design.accent.includes("name") ? style.accent : style.text;
  const mutedColor = style.banner ? style.banner.muted : style.muted;
  const nameScale = Math.min(type.nameSize, 3.2);
  const name = cv.personal.fullName || " ";

  const photo = photoRun(cv, template);
  if (photo) out.push({ alignment: style.alignment, spacing: { after: 120 }, children: [photo] });

  out.push({
    alignment: style.alignment,
    spacing: { after: 40 },
    keepNext: true,
    children: [
      run(style, name, {
        fonts: style.name,
        bold: type.nameWeight >= 600,
        color: nameColor,
        scale: nameScale,
        allCaps: type.nameCase === "upper",
        characterSpacing: type.nameTracking > 0 ? Math.round(type.nameTracking * style.size * nameScale * 5) : undefined,
      }),
    ],
  });
  if (cv.personal.headline) {
    out.push({
      alignment: style.alignment,
      keepNext: true,
      children: [run(style, cv.personal.headline, { color: mutedColor, scale: 1.14 })],
    });
  }
  // "Name over a rule": the rule sits under the name block, contact below it.
  if (design.header === "rule") {
    out[out.length - 1] = {
      ...out[out.length - 1],
      border: { bottom: { ...border(style, "strong"), space: 6 } },
      spacing: { after: 100 },
    };
  }

  const separator = CONTACT_SEPARATORS[design.contactSeparator];
  const rows = template.layout.sidebar || design.header === "split" ? [contactLines(cv)] : contactRows(cv);
  rows
    .filter((row) => row.length > 0)
    .forEach((row, i) => {
      out.push({
        alignment: style.alignment,
        spacing: { before: i === 0 ? 80 : 0 },
        children: [run(style, row.map((l) => l.value).join(separator), { color: mutedColor, scale: 0.95 })],
      });
    });

  // Boxed header: the same border on every header paragraph makes Word draw one box around them.
  // Banner: the same shading on every header paragraph makes one band.
  const box = design.header === "boxed" ? border(style) : null;
  return out.map((options, i) => {
    const last = i === out.length - 1;
    return new Paragraph({
      ...options,
      ...(box ? { border: { top: box, bottom: box, left: box, right: box }, indent: { left: 120, right: 120 } } : {}),
      ...(style.banner
        ? { shading: { type: ShadingType.CLEAR, fill: style.banner.fill, color: "auto" }, indent: { left: 160, right: 160 } }
        : {}),
      ...(last ? { spacing: { ...options.spacing, after: Math.round(style.gap.section * 0.6) } } : {}),
    });
  });
}

/** The CV's photo for templates with a photo slot. Word reads PNG and JPEG; other formats are left out. */
function photoRun(cv: CVDocument, template: CVTemplate): ImageRun | null {
  const photo = cv.personal.photo;
  if (template.layout.photo === "none" || !photo) return null;
  const match = /^data:image\/(png|jpeg);base64,/.exec(photo);
  if (!match) return null;
  const portrait = template.layout.photo === "portrait";
  try {
    return new ImageRun({
      type: match[1] === "png" ? "png" : "jpg",
      data: photo,
      transformation: { width: portrait ? 94 : 102, height: portrait ? 121 : 102 },
    });
  } catch {
    return null; // an unreadable image must never block the export
  }
}

/* ---------- Section headings ---------- */

const RULED: Partial<Record<HeadingStyle, "top" | "bottom" | "both">> = {
  underline: "bottom",
  trail: "bottom",
  "center-rule": "bottom",
  overline: "top",
  double: "both",
};

function heading(style: Style, text: string, index: number): Paragraph {
  const { style: design, typography: type } = style.template;
  const accent = design.accent.includes("headings");
  const color = design.heading === "band" ? "FFFFFF" : design.heading === "tint" ? style.accent : design.heading === "label" && !accent ? style.muted : accent ? style.accent : style.text;
  const marker = design.accent.includes("markers") ? style.accent : style.muted;
  const upper = type.headingCase === "upper";
  // Small capitals carry Latin headings; Khmer has no capitals, so it keeps a readable size instead.
  const scale = hasKhmer(text) ? Math.max(type.headingSize, 1.06) : upper ? Math.max(type.headingSize, 0.9) : type.headingSize;
  const rule = border(style);
  const ruled = RULED[design.heading];
  const centered = design.headingAlign === "center" || design.heading === "center-rule" || design.heading === "double";

  const children: TextRun[] = [];
  if (design.heading === "numbered") {
    children.push(run(style, `${String(index).padStart(2, "0")}  `, { fonts: style.heading, color: marker, scale: scale * 0.7 }));
  }
  children.push(
    run(style, text, {
      fonts: style.heading,
      bold: type.headingWeight >= 600,
      color,
      scale,
      allCaps: upper,
      characterSpacing: upper ? 20 : undefined,
      border: design.heading === "boxed" ? { style: BorderStyle.SINGLE, size: 6, color, space: 2 } : undefined,
    }),
  );

  // Banded headings carry over as shaded paragraphs.
  const shade = design.heading === "band" ? style.accent : design.heading === "tint" ? mixColor(`#${style.accent}`, "#ffffff", 0.12).slice(1) : null;
  return new Paragraph({
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    ...(shade ? { shading: { type: ShadingType.CLEAR, fill: shade, color: "auto" } } : {}),
    spacing: { before: style.gap.section, after: ruled ? 110 : 90 },
    keepNext: true,
    keepLines: true,
    border: {
      ...(ruled === "bottom" || ruled === "both" ? { bottom: rule } : {}),
      ...(ruled === "top" || ruled === "both" ? { top: rule } : {}),
      ...(design.heading === "bar" ? { left: { style: BorderStyle.SINGLE, size: 24, color: marker, space: 6 } } : {}),
    },
    children,
  });
}

/* ---------- Entries ---------- */

/** Title, subtitle and date of one entry, arranged by the template's date placement. */
function entryHead(style: Style, title: string, subtitle: string | undefined, date: string): Paragraph[] {
  const { entry } = style.template.style;
  const titleColor = style.template.style.accent.includes("titles") ? style.accent : style.text;
  const bold = style.template.typography.titleWeight >= 600;
  const titleRun = run(style, title || " ", { bold, color: titleColor });
  const dateRun = (text: string) => run(style, text, { color: style.muted, scale: 0.93 });
  const out: Paragraph[] = [];
  const first = { spacing: { before: style.gap.entry }, keepNext: true, keepLines: true };

  if (entry === "date-left") {
    // Dates hang in the left column; the title starts at the tab stop.
    out.push(
      new Paragraph({
        ...first,
        indent: { left: style.dateColumn, hanging: style.dateColumn },
        tabStops: [{ type: TabStopType.LEFT, position: style.dateColumn }],
        children: [dateRun(date), run(style, "\t"), titleRun],
      }),
    );
  } else if (entry === "timeline" && date) {
    out.push(new Paragraph({ ...first, children: [dateRun(date)] }));
    out.push(new Paragraph({ keepNext: true, keepLines: true, children: [titleRun] }));
  } else if (entry === "date-right" && date) {
    out.push(
      new Paragraph({
        ...first,
        tabStops: [{ type: TabStopType.RIGHT, position: style.textWidth }],
        children: [titleRun, run(style, "\t"), dateRun(date)],
      }),
    );
  } else {
    out.push(new Paragraph({ ...first, children: [titleRun] }));
  }

  if (subtitle) {
    out.push(
      new Paragraph({
        ...entryIndent(style),
        keepNext: true,
        children: [run(style, subtitle, { color: style.muted, italics: style.italics })],
      }),
    );
  }
  if (entry === "date-below" && date) {
    out.push(new Paragraph({ ...entryIndent(style), keepNext: true, children: [dateRun(date)] }));
  }
  return out;
}

function textParagraphs(style: Style, text: string | undefined, extraBullets: string[] = [], indent = true): Paragraph[] {
  const { paragraphs, bullets } = parseDescription(text);
  const base = indent ? style.dateColumn : 0;
  const out = paragraphs.map(
    (p) => new Paragraph({ spacing: { before: 40 }, ...(base ? { indent: { left: base } } : {}), children: [run(style, p)] }),
  );
  for (const b of [...bullets, ...extraBullets.map((x) => x.trim()).filter(Boolean)]) {
    out.push(
      new Paragraph({
        numbering: { reference: BULLETS, level: 0 },
        indent: { left: base + 340, hanging: 220 },
        spacing: { before: 20 },
        children: [run(style, b)],
      }),
    );
  }
  return out;
}

function mutedLine(style: Style, text: string): Paragraph {
  return new Paragraph({
    ...entryIndent(style),
    spacing: { before: 40 },
    children: [run(style, text, { color: style.muted, scale: 0.93 })],
  });
}

function labelled(style: Style, label: string, value: string): Paragraph {
  const bold = style.template.typography.titleWeight >= 600;
  const { skills } = style.template.style;
  // "Rows" templates align the values in a second column, like the page does.
  if (skills === "rows" && label) {
    const column = twips(38);
    return new Paragraph({
      spacing: { before: 40 },
      indent: { left: column, hanging: column },
      tabStops: [{ type: TabStopType.LEFT, position: column }],
      children: [run(style, label, { bold }), run(style, "\t"), run(style, value)],
    });
  }
  return new Paragraph({
    spacing: { before: 40 },
    children: label ? [run(style, `${label}: `, { bold }), run(style, value)] : [run(style, value)],
  });
}

function sectionBody(cv: CVDocument, style: Style, key: SectionKey): Paragraph[] {
  const lang = cv.metadata.language;
  const labels = getCVLabels(lang);
  const lead = style.template.style.entryLead;
  const out: Paragraph[] = [];

  switch (key) {
    case "summary":
      out.push(...textParagraphs(style, cv.summary, [], false));
      break;
    case "experiences":
      for (const e of cv.experiences) {
        const { title, subtitle } = experienceLines(e, lead);
        out.push(...entryHead(style, title, subtitle, formatDateRange(e.startDate, e.endDate, e.isCurrent, lang)));
        out.push(...textParagraphs(style, e.description, e.achievements));
        if (e.technologies.length) out.push(mutedLine(style, `${labels.technologies}: ${e.technologies.join(", ")}`));
      }
      break;
    case "education":
      for (const e of cv.education) {
        const { title, subtitle } = educationLines(e, lead);
        out.push(...entryHead(style, title, subtitle, formatDateRange(e.startDate, e.endDate, false, lang)));
        out.push(...textParagraphs(style, e.description, e.achievements));
      }
      break;
    case "skills":
      for (const g of cv.skills.filter((g) => g.skills.length > 0)) {
        out.push(labelled(style, g.category, g.skills.map((s) => s.name).join(", ")));
      }
      break;
    case "projects":
      for (const p of cv.projects) {
        out.push(
          ...entryHead(
            style,
            p.name,
            joinParts([p.role, p.url?.replace(/^https?:\/\//i, "")]),
            formatDateRange(p.startDate, p.endDate, false, lang),
          ),
        );
        out.push(...textParagraphs(style, p.description));
        if (p.technologies.length) out.push(mutedLine(style, `${labels.technologies}: ${p.technologies.join(", ")}`));
      }
      break;
    case "certifications":
      for (const c of cv.certifications) {
        out.push(...entryHead(style, c.name, c.issuer, formatPartialDate(c.date, lang)));
      }
      break;
    case "languages":
      for (const l of cv.languages) {
        out.push(l.proficiency ? labelled(style, l.name, l.proficiency) : labelled(style, "", l.name));
      }
      break;
    case "awards":
      for (const a of cv.awards) {
        out.push(...entryHead(style, a.title, a.issuer, formatPartialDate(a.date, lang)));
        out.push(...textParagraphs(style, a.description));
      }
      break;
    case "references":
      for (const r of cv.references) {
        out.push(...entryHead(style, r.name, joinParts([r.position, r.company]), ""));
        const contact = joinParts([r.email, r.phone]);
        if (contact) out.push(new Paragraph({ ...entryIndent(style), spacing: { before: 40 }, children: [run(style, contact)] }));
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
  const children: Paragraph[] = headerParagraphs(cv, style);
  let index = 0;

  for (const key of getVisibleSections(cv, template)) {
    if (key === "customSections") {
      for (const section of cv.customSections.filter((s) => s.items.length > 0)) {
        children.push(heading(style, section.title || labels.sections.customSections, ++index));
        for (const item of section.items) {
          children.push(...entryHead(style, item.title, item.subtitle, formatPartialDate(item.date, cv.metadata.language)));
          children.push(...textParagraphs(style, item.description));
        }
      }
      continue;
    }
    children.push(heading(style, labels.sections[key], ++index), ...sectionBody(cv, style, key));
  }

  const markerColor = template.style.accent.includes("markers") ? style.accent : style.muted;
  return new Document({
    creator: "ThaFlow CV",
    title: cv.metadata.title,
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: BULLET_CHARS[template.style.bullet],
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 340, hanging: 220 } },
                run: { color: markerColor, font: { ascii: "Arial", hAnsi: "Arial", cs: style.body.khmer } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: { top: style.margin.y, right: style.margin.x, bottom: style.margin.y, left: style.margin.x },
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
