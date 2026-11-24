import {
  AlignmentType,
  BorderStyle,
  Document,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  TabStopType,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  VerticalPositionRelativeFrom,
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
  identityRows,
  joinParts,
  parseDescription,
  personalDetailRows,
  placeSections,
  resolveAppearance,
  type FieldRow,
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
 * fills, the photo, the page title of the formal sheets and their
 * "label : value" rows. Everything else falls back to a clean single column:
 * two-column templates are flattened, sidebars lose their fill, and monograms,
 * timelines, skill tags, icons and page decoration become plain text or go.
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
  /** Text colour that reads on a fill of the accent. */
  onAccent: string;
  /** The pale bar of "plate" headings and the text colour on it. */
  plate: { background: string; text: string };
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
  /** Width of the column that holds dates (and, on a form, row labels), twips (0 when dates sit elsewhere). */
  dateColumn: number;
  /** Where the text beside that column starts: after the colon on a form. */
  textIndent: number;
  /** The label column of "label : value" rows, twips. */
  labelColumn: number;
  /** Every entry, skill group and language is a "label : value" row. */
  form: boolean;
  /** Synthetic slanting hurts Khmer; italics are Latin-only and only where the template uses them. */
  italics: boolean;
  /** Banner fill behind the header paragraphs, if the template has one. */
  banner: { fill: string; text: string; muted: string } | null;
}

/** Room for ": " after the label column of a row, twips. */
const COLON_WIDTH = 170;

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
  const form = design.entry === "form";
  // Khmer month names run longer than English ones.
  const dateColumn = design.entry === "date-left" || form ? twips(khmer ? 46 : 38) : 0;
  return {
    template,
    body: fontsFor(look.bodyFont),
    heading: fontsFor(look.headingFont),
    name: fontsFor(look.nameFont),
    accent: hex(look.primary),
    onAccent: hex(look.onPrimary),
    plate: { background: hex(look.plate.background), text: hex(look.plate.text) },
    text: hex(colors.text),
    muted: hex(colors.muted),
    rule: has("rules") ? hex(look.primary) : hex(colors.rule),
    size,
    textWidth: PAGE_WIDTH - 2 * marginX,
    margin: { x: marginX, y: marginY },
    gap: { section: twips(density.gapSection) + 60, entry: twips(density.gapEntry) },
    alignment: design.header === "center" || design.header === "boxed" ? AlignmentType.CENTER : AlignmentType.LEFT,
    dateColumn,
    textIndent: dateColumn + (form ? COLON_WIDTH : 0),
    labelColumn: form ? dateColumn : twips(khmer ? 42 : 38),
    form,
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

/** Indent of what belongs to an entry, when its dates sit in a left column. */
const indented = (left: number) => (left ? { indent: { left } } : {});

/* ---------- Rows: "label : value" ---------- */

/** One row: the label, then a colon and the value at the label column's tab stop. Wrapped lines keep to the value. */
function fieldRow(style: Style, label: string, value: TextRun[], column = style.labelColumn): IParagraphOptions {
  return {
    spacing: { before: 40 },
    indent: { left: column + COLON_WIDTH, hanging: column + COLON_WIDTH },
    tabStops: [{ type: TabStopType.LEFT, position: column }],
    children: [run(style, label), run(style, "\t: "), ...value],
  };
}

const fieldRows = (style: Style, rows: FieldRow[]): Paragraph[] => rows.map((row) => new Paragraph(fieldRow(style, row.label, [run(style, row.value)])));

/* ---------- Header ---------- */

/** The national motto and the document's title, for the templates that head the page with them. */
function mastheadParagraphs(cv: CVDocument, style: Style, anchored: ImageRun | null = null): Paragraph[] {
  const { masthead } = style.template.layout;
  if (masthead === "none") return [];
  const labels = getCVLabels(cv.metadata.language);
  const line = (text: string, scale: number, after: number, underline = false, lead: ImageRun | null = null) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after },
      keepNext: true,
      children: [...(lead ? [lead] : []), run(style, text, { fonts: style.heading, bold: true, scale, allCaps: true, ...(underline ? { underline: {} } : {}) })],
    });
  // With a photo in the corner the title needs the height of the photo before the rows begin.
  const after = anchored ? 1250 : 220;
  return masthead === "national"
    ? [line(labels.nation[0], 1.08, 0, false, anchored), line(labels.nation[1], 1.08, 160), line(labels.documentTitle, 1.18, after, true)]
    : [line(labels.documentTitle, 1.34, after, true, anchored)];
}

function nameRun(cv: CVDocument, style: Style, color: string, scale: number): TextRun {
  const { typography: type } = style.template;
  return run(style, cv.personal.fullName || " ", {
    fonts: style.name,
    bold: type.nameWeight >= 600,
    color,
    scale,
    allCaps: type.nameCase === "upper",
    characterSpacing: type.nameTracking > 0 ? Math.round(type.nameTracking * style.size * scale * 5) : undefined,
  });
}

/**
 * The header of the templates that print it as a form: the page title, the
 * photo, then the name, the position and the contact details as rows. A sheet
 * titles that block and takes the personal details into it.
 */
function formHeader(cv: CVDocument, style: Style): Paragraph[] {
  const { template } = style;
  const { style: design, typography: type } = template;
  const labels = getCVLabels(cv.metadata.language);
  const details = placeSections(cv, template).header.includes("personalDetails") ? personalDetailRows(cv, labels) : [];
  const rows = identityRows(cv, labels, details);
  const nameColor = design.accent.includes("name") ? style.accent : style.text;
  // The photo stands in the corner: over the title on a sheet, beside the rows otherwise, which wrap around it.
  const sheet = design.header === "sheet";
  const photo = photoRun(cv, template, sheet ? "corner" : "beside");
  const out: Paragraph[] = mastheadParagraphs(cv, style, sheet ? photo : null);
  if (sheet) out.push(heading(style, labels.sections.personalDetails, 1, 0));

  const body: IParagraphOptions[] = rows.map((row) => {
    if (row.key !== "name") return fieldRow(style, row.label, [run(style, row.value)]);
    const name = nameRun(cv, style, nameColor, Math.min(type.nameSize, 3.2));
    // "Lines" sets the name on its own, large; the other two make it the first row.
    return design.header === "lines" ? { spacing: { after: 60 }, keepNext: true, children: [name] } : fieldRow(style, row.label, [name]);
  });
  if (photo && !sheet && body[0]) body[0] = { ...body[0], children: [photo, ...(body[0].children ?? [])] };
  // The rule that closes the header belongs to its last row.
  const ruled = design.header !== "sheet";
  body.forEach((options, i) => {
    const last = i === body.length - 1;
    out.push(
      new Paragraph({
        ...options,
        ...(last && ruled ? { border: { bottom: { ...border(style, "strong"), space: 8 } } } : {}),
        ...(last ? { spacing: { ...options.spacing, after: Math.round(style.gap.section * 0.6) } } : {}),
      }),
    );
  });
  return out;
}

function headerParagraphs(cv: CVDocument, style: Style): Paragraph[] {
  const { template } = style;
  const { typography: type, style: design } = template;
  if (design.header === "form" || design.header === "lines" || design.header === "sheet") return formHeader(cv, style);
  const out: IParagraphOptions[] = [];
  const nameColor = style.banner ? style.banner.text : design.accent.includes("name") ? style.accent : style.text;
  const mutedColor = style.banner ? style.banner.muted : style.muted;
  const nameScale = Math.min(type.nameSize, 3.2);

  const photo = photoRun(cv, template);
  if (photo) out.push({ alignment: style.alignment, spacing: { after: 120 }, children: [photo] });

  out.push({
    alignment: style.alignment,
    spacing: { after: 40 },
    keepNext: true,
    children: [nameRun(cv, style, nameColor, nameScale)],
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
  const header = out.map((options, i) => {
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
  return [...mastheadParagraphs(cv, style), ...header];
}

/**
 * The CV's photo for templates with a photo slot. Word reads PNG and JPEG; other formats are left out.
 * Normally it sits in the text like a large letter. "beside" anchors it at the right margin with the
 * text wrapping to its left; "corner" anchors it there over the text, which keeps its own alignment.
 */
function photoRun(cv: CVDocument, template: CVTemplate, placement: "inline" | "beside" | "corner" = "inline"): ImageRun | null {
  const photo = cv.personal.photo;
  if (template.layout.photo === "none" || !photo) return null;
  const match = /^data:image\/(png|jpeg);base64,/.exec(photo);
  if (!match) return null;
  const portrait = template.layout.photo === "portrait" || template.layout.photo === "cover";
  try {
    return new ImageRun({
      type: match[1] === "png" ? "png" : "jpg",
      data: photo,
      transformation: { width: portrait ? 94 : 102, height: portrait ? 121 : 102 },
      ...(placement === "inline"
        ? {}
        : {
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
              wrap: placement === "beside" ? { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT } : { type: TextWrappingType.NONE },
              margins: { left: 180000 },
            },
          }),
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

function heading(style: Style, text: string, index: number, before = style.gap.section): Paragraph {
  const { style: design, typography: type } = style.template;
  const accent = design.accent.includes("headings");
  const filled = design.heading === "band" || design.heading === "pill";
  const color = filled ? style.onAccent : design.heading === "plate" ? style.plate.text : design.heading === "tint" ? style.accent : design.heading === "label" && !accent ? style.muted : accent ? style.accent : style.text;
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

  // Banded headings carry over as shaded paragraphs; a pill loses its round ends.
  const shade = filled ? style.accent : design.heading === "plate" ? style.plate.background : design.heading === "tint" ? mixColor(`#${style.accent}`, "#ffffff", 0.12).slice(1) : null;
  return new Paragraph({
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    ...(shade ? { shading: { type: ShadingType.CLEAR, fill: shade, color: "auto" } } : {}),
    spacing: { before, after: ruled ? 110 : 90 },
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

/**
 * Where the text of an entry starts. Beside a date column it is indented past
 * it; on a form an entry without a date has no row to sit in, and runs full width.
 */
const entryIndent = (style: Style, date: string) => (style.form && !date ? 0 : style.textIndent);

/** Title, subtitle and date of one entry, arranged by the template's date placement. */
function entryHead(style: Style, title: string, subtitle: string | undefined, date: string): Paragraph[] {
  const { entry } = style.template.style;
  const titleColor = style.template.style.accent.includes("titles") ? style.accent : style.text;
  const bold = style.template.typography.titleWeight >= 600;
  const titleRun = run(style, title || " ", { bold, color: titleColor });
  const dateRun = (text: string) => run(style, text, { color: style.muted, scale: 0.93 });
  const out: Paragraph[] = [];
  const first = { spacing: { before: style.gap.entry }, keepNext: true, keepLines: true };
  const left = entryIndent(style, date);

  if (entry === "form" && date) {
    // A row: the dates where a label would be, a colon, the title.
    out.push(new Paragraph({ ...fieldRow(style, date, [titleRun], style.dateColumn), ...first }));
  } else if (entry === "date-lead" && date) {
    // The dates open the title line.
    out.push(new Paragraph({ ...first, children: [run(style, `${date}: `, { bold, color: titleColor }), titleRun] }));
  } else if (entry === "date-left") {
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
        ...indented(left),
        keepNext: true,
        children: [run(style, subtitle, { color: style.muted, italics: style.italics })],
      }),
    );
  }
  if (entry === "date-below" && date) {
    out.push(new Paragraph({ ...indented(left), keepNext: true, children: [dateRun(date)] }));
  }
  return out;
}

function textParagraphs(style: Style, text: string | undefined, extraBullets: string[] = [], base = 0): Paragraph[] {
  const { paragraphs, bullets } = parseDescription(text);
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

function mutedLine(style: Style, text: string, left: number): Paragraph {
  return new Paragraph({
    ...indented(left),
    spacing: { before: 40 },
    children: [run(style, text, { color: style.muted, scale: 0.93 })],
  });
}

function labelled(style: Style, label: string, value: string): Paragraph {
  const bold = style.template.typography.titleWeight >= 600;
  const { skills } = style.template.style;
  // On a form a skill group or a language is a row like any other.
  if (style.form && label) return new Paragraph(fieldRow(style, label, [run(style, value)]));
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
    case "personalDetails":
      out.push(...fieldRows(style, personalDetailRows(cv, labels)));
      break;
    case "summary":
      out.push(...textParagraphs(style, cv.summary));
      break;
    case "experiences":
      for (const e of cv.experiences) {
        const { title, subtitle } = experienceLines(e, lead);
        const date = formatDateRange(e.startDate, e.endDate, e.isCurrent, lang);
        const left = entryIndent(style, date);
        out.push(...entryHead(style, title, subtitle, date));
        out.push(...textParagraphs(style, e.description, e.achievements, left));
        if (e.technologies.length) out.push(mutedLine(style, `${labels.technologies}: ${e.technologies.join(", ")}`, left));
      }
      break;
    case "education":
      for (const e of cv.education) {
        const { title, subtitle } = educationLines(e, lead);
        const date = formatDateRange(e.startDate, e.endDate, false, lang);
        out.push(...entryHead(style, title, subtitle, date));
        out.push(...textParagraphs(style, e.description, e.achievements, entryIndent(style, date)));
      }
      break;
    case "skills":
      for (const g of cv.skills.filter((g) => g.skills.length > 0)) {
        out.push(labelled(style, g.category, g.skills.map((s) => s.name).join(", ")));
      }
      break;
    case "projects":
      for (const p of cv.projects) {
        const date = formatDateRange(p.startDate, p.endDate, false, lang);
        const left = entryIndent(style, date);
        out.push(...entryHead(style, p.name, joinParts([p.role, p.url?.replace(/^https?:\/\//i, "")]), date));
        out.push(...textParagraphs(style, p.description, [], left));
        if (p.technologies.length) out.push(mutedLine(style, `${labels.technologies}: ${p.technologies.join(", ")}`, left));
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
        const date = formatPartialDate(a.date, lang);
        out.push(...entryHead(style, a.title, a.issuer, date));
        out.push(...textParagraphs(style, a.description, [], entryIndent(style, date)));
      }
      break;
    case "references":
      for (const r of cv.references) {
        out.push(...entryHead(style, r.name, joinParts([r.position, r.company]), ""));
        const contact = joinParts([r.email, r.phone]);
        if (contact) out.push(new Paragraph({ ...indented(entryIndent(style, "")), spacing: { before: 40 }, children: [run(style, contact)] }));
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

  // A sheet header has already printed the personal details, under a heading of its own.
  const inHeader = placeSections(cv, template).header;
  if (template.style.header === "sheet") index = 1;

  for (const key of getVisibleSections(cv, template).filter((k) => !inHeader.includes(k))) {
    if (key === "customSections") {
      for (const section of cv.customSections.filter((s) => s.items.length > 0)) {
        children.push(heading(style, section.title || labels.sections.customSections, ++index));
        for (const item of section.items) {
          const date = formatPartialDate(item.date, cv.metadata.language);
          children.push(...entryHead(style, item.title, item.subtitle, date));
          children.push(...textParagraphs(style, item.description, [], entryIndent(style, date)));
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
