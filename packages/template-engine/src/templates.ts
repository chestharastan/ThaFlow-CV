import { SECTION_KEYS, type CVLanguage, type SectionKey } from "@thaflow/cv-core";

/** Primary style family, used for the gallery filter. */
export type TemplateCategory = "simple" | "modern" | "classic" | "creative";
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["simple", "modern", "classic", "creative"];

/* ---------- Design axes ----------
 * A template is one value per axis. The single renderer (<CVPreview>) turns each
 * value into a modifier class or CSS variable, so a new template is configuration only.
 */

/** Page structure. "split" = full-width header over two balanced columns; "label" = section titles in a left gutter. */
export type LayoutKind = "single" | "sidebar-left" | "sidebar-right" | "split" | "label";
/** Where the name sits on sidebar layouts: across both columns, above the main column, or in the sidebar. */
export type HeaderPlacement = "full" | "main" | "sidebar";
export type HeaderStyle = "left" | "center" | "split" | "rule" | "boxed" | "monogram" | "banner";
export type HeadingStyle =
  | "caps"
  | "underline"
  | "bar"
  | "boxed"
  | "plain"
  | "overline"
  | "center-rule"
  | "numbered"
  | "label"
  | "trail"
  | "double";
/** Where an entry's dates go. */
export type EntryStyle = "date-right" | "date-left" | "date-below" | "timeline";
/** Which line of an experience/education entry is emphasised: the role/degree or the organisation. */
export type EntryLead = "role" | "org";
export type SkillStyle = "list" | "rows" | "pills" | "columns";
export type Density = "compact" | "regular" | "airy";
export type PhotoStyle = "none" | "circle" | "rounded" | "portrait";
/** Filled areas. "none" means pure text on a white page. */
export type FillStyle = "none" | "sidebar-tint" | "sidebar-dark" | "banner-tint" | "banner-dark";
/** Parts of the page that take the accent colour (fills always do). */
export type AccentTarget = "name" | "headings" | "rules" | "titles" | "markers";
export type RuleWeight = "hair" | "medium" | "heavy";
export type BulletStyle = "disc" | "dash" | "square";
export type ContactSeparator = "space" | "dot" | "pipe" | "slash";
export type TextCase = "normal" | "upper";

export interface CVTemplate {
  id: string;
  /** Short one-word display name. */
  name: string;
  description: string;
  category: TemplateCategory;
  supportedLanguages: CVLanguage[];
  /** What the design is tuned for. Informational; rendering never branches on these. */
  traits: {
    /** Single column, plain headings, standard fonts: reads cleanly in applicant-tracking systems. */
    ats: boolean;
    /** Designed from Khmer type outwards. */
    khmerFirst: boolean;
    /** Meant for CVs that mix Khmer and English. */
    bilingual: boolean;
  };
  layout: {
    kind: LayoutKind;
    columns: 1 | 2;
    sidebar: boolean;
    /** Shape of the photo slot. A photo is only rendered when the CV has one. */
    photo: PhotoStyle;
    headerPlacement: HeaderPlacement;
    /** Millimetres; sidebar layouts only. */
    sidebarWidth: number;
    /** Hairline between the two columns of an unfilled two-column layout. */
    divider: boolean;
  };
  typography: {
    /** Keys into FONT_STACKS. */
    nameFont: FontKey;
    headingFont: FontKey;
    bodyFont: FontKey;
    /** Points. */
    baseFontSize: number;
    /** Multiplier applied to the base size for Khmer CVs, for stacks whose Latin face runs small. */
    khmerScale: number;
    /** Name size in em of the base size. */
    nameSize: number;
    nameWeight: number;
    nameCase: TextCase;
    /** Em. Latin only; Khmer is never letter-spaced. */
    nameTracking: number;
    headingCase: TextCase;
    /** Em of the base size. */
    headingSize: number;
    headingWeight: number;
    /** Weight of entry titles. */
    titleWeight: number;
    /** Width of the date column of "date-left" entries, in em. */
    dateColumn: number;
  };
  colors: {
    /** Default accent; the CV's own primaryColor overrides it. */
    primary: string;
    text: string;
    muted: string;
    background: string;
    /** Hairlines that do not take the accent. */
    rule: string;
  };
  style: {
    header: HeaderStyle;
    heading: HeadingStyle;
    headingAlign: "left" | "center";
    entry: EntryStyle;
    entryLead: EntryLead;
    skills: SkillStyle;
    density: Density;
    fill: FillStyle;
    accent: AccentTarget[];
    rules: RuleWeight;
    bullet: BulletStyle;
    contactSeparator: ContactSeparator;
    /** Italic entry subtitles (Latin only; Khmer is never slanted). */
    subtitleItalic: boolean;
  };
  supportedSections: SectionKey[];
}

/* ---------- Fonts ---------- */

/**
 * Every stack ends with Khmer-capable fonts so mixed Khmer/English text never
 * falls back to a font without Khmer shaping. Latin-first stacks name the Latin
 * face first (it has no Khmer glyphs, so Khmer falls through to the Khmer face);
 * Khmer-first stacks use families that ship a matching Latin design.
 */
export const FONT_STACKS = {
  inter: `"Inter Variable", "Inter", "Noto Sans Khmer", "Khmer OS Battambang", system-ui, sans-serif`,
  "dm-sans": `"DM Sans", "Kantumruy Pro", "Noto Sans Khmer", system-ui, sans-serif`,
  "plex-sans": `"IBM Plex Sans", "Noto Sans Khmer", "Khmer OS Battambang", system-ui, sans-serif`,
  grotesk: `"Space Grotesk", "Kantumruy Pro", "Noto Sans Khmer", system-ui, sans-serif`,
  /** Standard system sans (ATS-safe). */
  sans: `Arial, Helvetica, "Liberation Sans", "Noto Sans Khmer", "Khmer OS Battambang", sans-serif`,
  "source-serif": `"Source Serif 4", Georgia, "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  garamond: `"EB Garamond", Georgia, "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  lora: `"Lora", Georgia, "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  playfair: `"Playfair Display", Georgia, "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  serif: `Georgia, "Times New Roman", "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  /** Standard system serif (ATS-safe). */
  times: `"Times New Roman", Times, "Liberation Serif", "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  mono: `"IBM Plex Mono", "SF Mono", Menlo, Consolas, "Noto Sans Khmer", monospace`,
  "noto-khmer": `"Noto Sans Khmer", "Khmer OS Battambang", system-ui, sans-serif`,
  kantumruy: `"Kantumruy Pro", "Noto Sans Khmer", system-ui, sans-serif`,
  battambang: `"Battambang", "Noto Serif Khmer", "Khmer OS Battambang", Georgia, serif`,
  hanuman: `"Hanuman", "Noto Sans Khmer", "Khmer OS Battambang", system-ui, sans-serif`,
  "noto-serif-khmer": `"Noto Serif Khmer", "Khmer OS Siemreap", Georgia, serif`,
  /** Khmer display face for names and headings; Latin letters use Playfair Display. */
  moul: `"Playfair Display", "Moul", "Noto Serif Khmer", Georgia, serif`,
} as const;
export type FontKey = keyof typeof FONT_STACKS;

/**
 * Web fonts bundled with the app (never requested from a third party) and the
 * @fontsource stylesheets each one needs. apps/web/app/cv-fonts.ts imports
 * exactly these files; a unit test keeps the two in step.
 */
export const BUNDLED_FONTS: Record<string, { package: string; files: string[] }> = {
  "Inter Variable": { package: "@fontsource-variable/inter", files: ["wght.css"] },
  "DM Sans": { package: "@fontsource/dm-sans", files: ["latin-400.css", "latin-600.css", "latin-700.css"] },
  "IBM Plex Sans": { package: "@fontsource/ibm-plex-sans", files: ["latin-400.css", "latin-600.css"] },
  "IBM Plex Mono": { package: "@fontsource/ibm-plex-mono", files: ["latin-400.css", "latin-600.css"] },
  "Space Grotesk": { package: "@fontsource/space-grotesk", files: ["latin-400.css", "latin-500.css", "latin-700.css"] },
  "Source Serif 4": {
    package: "@fontsource/source-serif-4",
    files: ["latin-400.css", "latin-400-italic.css", "latin-600.css", "latin-700.css"],
  },
  "EB Garamond": {
    package: "@fontsource/eb-garamond",
    files: ["latin-400.css", "latin-400-italic.css", "latin-500.css", "latin-700.css"],
  },
  Lora: { package: "@fontsource/lora", files: ["latin-400.css", "latin-400-italic.css", "latin-600.css"] },
  "Playfair Display": { package: "@fontsource/playfair-display", files: ["latin-400.css", "latin-700.css", "latin-800.css"] },
  // Khmer families: the per-weight stylesheet carries both the Khmer and the Latin subset with unicode-range.
  "Noto Sans Khmer": { package: "@fontsource/noto-sans-khmer", files: ["400.css", "700.css"] },
  "Kantumruy Pro": { package: "@fontsource/kantumruy-pro", files: ["400.css", "600.css", "700.css"] },
  Battambang: { package: "@fontsource/battambang", files: ["400.css", "700.css"] },
  Hanuman: { package: "@fontsource/hanuman", files: ["400.css", "700.css"] },
  "Noto Serif Khmer": { package: "@fontsource/noto-serif-khmer", files: ["400.css", "700.css"] },
  Moul: { package: "@fontsource/moul", files: ["400.css"] },
};

interface FontInfo {
  label: string;
  /** Bundled families the stack relies on (keys of BUNDLED_FONTS). */
  bundled: string[];
  /** Fonts named in Word documents: widely installed Latin faces, and the Khmer face for complex-script runs. */
  docx: { latin: string; khmer: string };
}

export const FONT_INFO: Record<FontKey, FontInfo> = {
  inter: { label: "Inter", bundled: ["Inter Variable", "Noto Sans Khmer"], docx: { latin: "Arial", khmer: "Noto Sans Khmer" } },
  "dm-sans": {
    label: "DM Sans",
    bundled: ["DM Sans", "Kantumruy Pro", "Noto Sans Khmer"],
    docx: { latin: "Arial", khmer: "Kantumruy Pro" },
  },
  "plex-sans": {
    label: "IBM Plex Sans",
    bundled: ["IBM Plex Sans", "Noto Sans Khmer"],
    docx: { latin: "Arial", khmer: "Noto Sans Khmer" },
  },
  grotesk: {
    label: "Space Grotesk",
    bundled: ["Space Grotesk", "Kantumruy Pro", "Noto Sans Khmer"],
    docx: { latin: "Arial", khmer: "Kantumruy Pro" },
  },
  sans: { label: "Arial", bundled: ["Noto Sans Khmer"], docx: { latin: "Arial", khmer: "Noto Sans Khmer" } },
  "source-serif": {
    label: "Source Serif",
    bundled: ["Source Serif 4", "Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Georgia", khmer: "Noto Serif Khmer" },
  },
  garamond: {
    label: "EB Garamond",
    bundled: ["EB Garamond", "Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Times New Roman", khmer: "Noto Serif Khmer" },
  },
  lora: {
    label: "Lora",
    bundled: ["Lora", "Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Georgia", khmer: "Noto Serif Khmer" },
  },
  playfair: {
    label: "Playfair Display",
    bundled: ["Playfair Display", "Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Georgia", khmer: "Noto Serif Khmer" },
  },
  serif: {
    label: "Georgia",
    bundled: ["Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Georgia", khmer: "Noto Serif Khmer" },
  },
  times: {
    label: "Times New Roman",
    bundled: ["Noto Serif Khmer", "Noto Sans Khmer"],
    docx: { latin: "Times New Roman", khmer: "Noto Serif Khmer" },
  },
  mono: {
    label: "IBM Plex Mono",
    bundled: ["IBM Plex Mono", "Noto Sans Khmer"],
    docx: { latin: "Consolas", khmer: "Noto Sans Khmer" },
  },
  "noto-khmer": { label: "Noto Sans Khmer", bundled: ["Noto Sans Khmer"], docx: { latin: "Noto Sans Khmer", khmer: "Noto Sans Khmer" } },
  kantumruy: {
    label: "Kantumruy Pro",
    bundled: ["Kantumruy Pro", "Noto Sans Khmer"],
    docx: { latin: "Kantumruy Pro", khmer: "Kantumruy Pro" },
  },
  battambang: {
    label: "Battambang",
    bundled: ["Battambang", "Noto Serif Khmer"],
    docx: { latin: "Battambang", khmer: "Battambang" },
  },
  hanuman: { label: "Hanuman", bundled: ["Hanuman", "Noto Sans Khmer"], docx: { latin: "Hanuman", khmer: "Hanuman" } },
  "noto-serif-khmer": {
    label: "Noto Serif Khmer",
    bundled: ["Noto Serif Khmer"],
    docx: { latin: "Noto Serif Khmer", khmer: "Noto Serif Khmer" },
  },
  moul: {
    label: "Moul",
    bundled: ["Playfair Display", "Moul", "Noto Serif Khmer"],
    docx: { latin: "Georgia", khmer: "Moul" },
  },
};

/** Fonts a person can choose for the whole CV. Display-only faces (Moul, Playfair Display) are left out. */
const FONT_OPTION_KEYS: FontKey[] = [
  "inter",
  "dm-sans",
  "plex-sans",
  "grotesk",
  "sans",
  "source-serif",
  "garamond",
  "lora",
  "serif",
  "times",
  "mono",
  "kantumruy",
  "noto-khmer",
  "hanuman",
  "battambang",
  "noto-serif-khmer",
];

export const FONT_OPTIONS: { key: FontKey; label: string; docxFont: string; docxKhmerFont: string }[] = FONT_OPTION_KEYS.map(
  (key) => ({ key, label: FONT_INFO[key].label, docxFont: FONT_INFO[key].docx.latin, docxKhmerFont: FONT_INFO[key].docx.khmer }),
);

/** Black and grays first, then a few restrained accents. All are dark enough to carry white text. */
export const COLOR_PRESETS = [
  "#111111",
  "#374151",
  "#6b7280",
  "#1e3a5f",
  "#1d4e89",
  "#155e75",
  "#0f766e",
  "#14532d",
  "#7a1f1f",
  "#9a3412",
];

/* ---------- Page geometry ---------- */

/** Spacing per density. Page padding on screen equals the @page margin in print. Millimetres. */
export const DENSITY: Record<
  Density,
  { padY: number; padX: number; gapSection: number; gapEntry: number; gapHeader: number; leading: number; leadingKm: number }
> = {
  compact: { padY: 11, padX: 13, gapSection: 3.8, gapEntry: 2.3, gapHeader: 4.6, leading: 1.36, leadingKm: 1.62 },
  regular: { padY: 14, padX: 16, gapSection: 5.4, gapEntry: 3.2, gapHeader: 6.6, leading: 1.46, leadingKm: 1.72 },
  airy: { padY: 18, padX: 20, gapSection: 7.6, gapEntry: 4.4, gapHeader: 9.4, leading: 1.56, leadingKm: 1.82 },
};

/* ---------- Registry ---------- */

const both: CVLanguage[] = ["en", "km"];
const INK = "#111111";

type Spec = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  traits?: Partial<CVTemplate["traits"]>;
  layout?: Partial<Omit<CVTemplate["layout"], "columns" | "sidebar">>;
  typography: Partial<CVTemplate["typography"]> & { bodyFont: FontKey };
  colors?: Partial<CVTemplate["colors"]>;
  style: Partial<CVTemplate["style"]> & { header: HeaderStyle; heading: HeadingStyle; entry: EntryStyle };
};

/** Headings that are small capitals by default (Latin); the rest are sentence case. */
const UPPER_HEADINGS: HeadingStyle[] = ["caps", "underline", "overline", "center-rule", "label", "trail", "double"];

function define(spec: Spec): CVTemplate {
  const kind = spec.layout?.kind ?? "single";
  const sidebar = kind === "sidebar-left" || kind === "sidebar-right";
  const headingCase = spec.typography.headingCase ?? (UPPER_HEADINGS.includes(spec.style.heading) ? "upper" : "normal");
  const headingFont = spec.typography.headingFont ?? spec.typography.bodyFont;
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    supportedLanguages: both,
    traits: { ats: false, khmerFirst: false, bilingual: false, ...spec.traits },
    layout: {
      kind,
      columns: sidebar || kind === "split" ? 2 : 1,
      sidebar,
      photo: "none",
      headerPlacement: sidebar ? "main" : "full",
      sidebarWidth: 58,
      divider: false,
      ...spec.layout,
    },
    typography: {
      nameFont: headingFont,
      headingFont,
      baseFontSize: 10,
      khmerScale: 1,
      nameSize: 2.3,
      nameWeight: 700,
      nameCase: "normal",
      nameTracking: 0,
      headingCase,
      headingSize: headingCase === "upper" ? 0.84 : 1.12,
      headingWeight: 700,
      titleWeight: 600,
      dateColumn: 11,
      ...spec.typography,
    },
    colors: { primary: INK, text: "#1a1a1a", muted: "#5c6066", background: "#ffffff", rule: "#cfd2d6", ...spec.colors },
    style: {
      headingAlign: "left",
      entryLead: "role",
      skills: "list",
      density: "regular",
      fill: "none",
      accent: ["name", "headings"],
      rules: "hair",
      bullet: "disc",
      contactSeparator: "space",
      subtitleItalic: false,
      ...spec.style,
    },
    supportedSections: [...SECTION_KEYS],
  };
}

/**
 * The registry, in display order. The first template is the default for new CVs
 * and the fallback for unknown ids; the first few are the most broadly suitable.
 */
export const templates: CVTemplate[] = [
  define({
    id: "minimal",
    name: "Minimal",
    description: "Clean single column with quiet hairlines. Suits almost any role.",
    category: "simple",
    typography: { bodyFont: "inter", nameSize: 2.4, nameWeight: 650, nameTracking: -0.02 },
    style: { header: "left", heading: "underline", entry: "date-right", skills: "rows" },
  }),
  define({
    id: "modern",
    name: "Modern",
    description: "Bold name over a strong rule, with contact and skills in a slim right column.",
    category: "modern",
    layout: { kind: "sidebar-right", headerPlacement: "full", photo: "circle", sidebarWidth: 54 },
    typography: { bodyFont: "dm-sans", baseFontSize: 9.8, nameSize: 2.8, nameTracking: -0.025 },
    style: { header: "rule", heading: "caps", entry: "date-below", rules: "heavy", accent: ["name", "headings", "rules"] },
  }),
  define({
    id: "executive",
    name: "Executive",
    description: "Centred display-serif name and ruled headings for senior roles.",
    category: "classic",
    typography: { bodyFont: "inter", headingFont: "playfair", baseFontSize: 9.8, nameSize: 2.7, headingCase: "normal", headingSize: 1.22 },
    style: {
      header: "center",
      heading: "center-rule",
      entry: "date-right",
      entryLead: "org",
      contactSeparator: "dot",
      density: "airy",
    },
  }),
  define({
    id: "margin",
    name: "Margin",
    description: "Section titles sit in a left margin, content on the right. Editorial and calm.",
    category: "modern",
    layout: { kind: "label" },
    typography: { bodyFont: "plex-sans", baseFontSize: 9.8, nameSize: 2.2, nameWeight: 600, nameTracking: -0.01, headingWeight: 600 },
    style: { header: "left", heading: "label", entry: "date-right", bullet: "dash", accent: ["name"] },
  }),
  define({
    id: "ats",
    name: "Plain",
    description: "ATS-friendly: one column, standard font, no decoration.",
    category: "simple",
    traits: { ats: true },
    typography: { bodyFont: "sans", baseFontSize: 10.5, nameSize: 1.9, headingSize: 1.16, titleWeight: 700 },
    colors: { text: "#000000", muted: "#333333", primary: "#000000" },
    style: { header: "left", heading: "plain", entry: "date-below", contactSeparator: "pipe", accent: ["headings"] },
  }),
  define({
    id: "corporate",
    name: "Corporate",
    description: "Traditional business serif with a centred name and ruled headings.",
    category: "classic",
    typography: { bodyFont: "source-serif", baseFontSize: 10.3, nameSize: 2.1, nameCase: "upper", nameTracking: 0.05, titleWeight: 700 },
    colors: { primary: "#1e3a5f" },
    style: {
      header: "center",
      heading: "underline",
      entry: "date-right",
      entryLead: "org",
      rules: "medium",
      contactSeparator: "pipe",
      subtitleItalic: true,
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "balance",
    name: "Balance",
    description: "Centred header over two balanced columns: experience left, education and skills right.",
    category: "modern",
    layout: { kind: "split" },
    typography: { bodyFont: "plex-sans", baseFontSize: 9.6, nameSize: 2.4, nameWeight: 600, nameTracking: -0.015 },
    style: {
      header: "center",
      heading: "overline",
      entry: "date-below",
      rules: "medium",
      contactSeparator: "dot",
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "timeline",
    name: "Timeline",
    description: "Experience and education run down a dated rail.",
    category: "modern",
    typography: { bodyFont: "dm-sans", nameSize: 2.4, nameTracking: -0.02 },
    style: { header: "left", heading: "caps", entry: "timeline", skills: "pills", accent: ["name", "headings", "markers"] },
  }),
  define({
    id: "angkor",
    name: "Angkor",
    description: "Khmer-first formal style: Moul titles with Battambang text, centred.",
    category: "classic",
    traits: { khmerFirst: true },
    layout: { photo: "portrait" },
    typography: {
      bodyFont: "battambang",
      headingFont: "moul",
      baseFontSize: 10.4,
      nameSize: 1.85,
      nameWeight: 800,
      headingCase: "normal",
      headingSize: 1,
      headingWeight: 800,
      titleWeight: 700,
    },
    colors: { primary: "#7a1f1f" },
    style: {
      header: "center",
      heading: "double",
      headingAlign: "center",
      entry: "date-right",
      skills: "rows",
      contactSeparator: "dot",
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "bilingual",
    name: "Mekong",
    description: "For CVs that mix Khmer and English: one typeface designed for both scripts.",
    category: "simple",
    traits: { bilingual: true },
    layout: { photo: "circle" },
    typography: { bodyFont: "kantumruy", baseFontSize: 10.1, nameSize: 2.2, headingCase: "normal", headingSize: 1.14 },
    colors: { primary: "#155e75" },
    style: { header: "left", heading: "trail", entry: "date-right", skills: "rows", accent: ["name", "headings", "rules"] },
  }),
  define({
    id: "compact",
    name: "Compact",
    description: "Dense layout that fits a long history on one page.",
    category: "simple",
    typography: { bodyFont: "inter", baseFontSize: 9, nameSize: 2, nameTracking: -0.015 },
    style: { header: "split", heading: "trail", entry: "date-right", density: "compact" },
  }),
  define({
    id: "academic",
    name: "Academic",
    description: "Scholarly serif with dates in a left column, for researchers and lecturers.",
    category: "classic",
    typography: { bodyFont: "garamond", baseFontSize: 11.4, khmerScale: 0.93, nameSize: 2, nameWeight: 500, titleWeight: 700 },
    style: {
      header: "center",
      heading: "underline",
      entry: "date-left",
      contactSeparator: "dot",
      subtitleItalic: true,
    },
  }),
  define({
    id: "technical",
    name: "Technical",
    description: "Monospaced headings and skill tags for developers and engineers.",
    category: "modern",
    typography: {
      bodyFont: "plex-sans",
      headingFont: "mono",
      baseFontSize: 9.6,
      nameSize: 2,
      nameWeight: 600,
      headingSize: 0.94,
      headingWeight: 600,
    },
    colors: { primary: "#1d4e89" },
    style: {
      header: "left",
      heading: "boxed",
      entry: "date-right",
      skills: "pills",
      bullet: "square",
      accent: ["name", "headings", "markers"],
    },
  }),
  define({
    id: "graduate",
    name: "Graduate",
    description: "Friendly and clear, with a photo slot and skill tags. Good for a first CV.",
    category: "modern",
    layout: { photo: "rounded" },
    typography: { bodyFont: "dm-sans", nameSize: 2.5, nameTracking: -0.02 },
    colors: { primary: "#0f766e" },
    style: { header: "left", heading: "bar", entry: "date-below", skills: "pills", accent: ["name", "headings", "markers"] },
  }),
  define({
    id: "ink",
    name: "Ink",
    description: "Heavy black rules and a strong uppercase name.",
    category: "simple",
    typography: { bodyFont: "inter", baseFontSize: 9.8, nameSize: 3, nameWeight: 800, nameCase: "upper", nameTracking: -0.01 },
    colors: { text: "#111111", primary: "#000000" },
    style: {
      header: "rule",
      heading: "overline",
      entry: "date-right",
      skills: "rows",
      rules: "heavy",
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "kampot",
    name: "Kampot",
    description: "Name, contact and skills in a quiet left column; your story on the right.",
    category: "simple",
    layout: { kind: "sidebar-left", headerPlacement: "sidebar", photo: "circle", sidebarWidth: 56 },
    typography: { bodyFont: "inter", baseFontSize: 9.6, nameSize: 2.1, nameTracking: -0.02 },
    style: { header: "left", heading: "caps", entry: "date-below" },
  }),
  define({
    id: "quiet",
    name: "Quiet",
    description: "Light, airy and understated, with small gray labels.",
    category: "simple",
    typography: { bodyFont: "inter", nameSize: 2.7, nameWeight: 300, nameTracking: -0.025, headingWeight: 600 },
    style: { header: "left", heading: "label", entry: "date-below", density: "airy", bullet: "dash", accent: ["name"] },
  }),
  define({
    id: "bassac",
    name: "Bassac",
    description: "Khmer-first modern sans: Kantumruy Pro titles over Noto Sans Khmer text.",
    category: "modern",
    traits: { khmerFirst: true },
    layout: { photo: "circle" },
    typography: { bodyFont: "noto-khmer", headingFont: "kantumruy", baseFontSize: 9.8, nameSize: 2.3, titleWeight: 700 },
    style: { header: "split", heading: "bar", entry: "date-right", skills: "pills", accent: ["name", "markers"] },
  }),
  define({
    id: "frame",
    name: "Frame",
    description: "Name set in a fine outlined box, with centred ruled headings.",
    category: "classic",
    typography: { bodyFont: "lora", baseFontSize: 10, nameSize: 2, nameWeight: 600, nameCase: "upper", nameTracking: 0.09 },
    style: {
      header: "boxed",
      heading: "center-rule",
      entry: "date-right",
      entryLead: "org",
      rules: "medium",
      contactSeparator: "dot",
      subtitleItalic: true,
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "oudong",
    name: "Oudong",
    description: "Elegant and spacious: a light, widely spaced name over centred headings.",
    category: "classic",
    typography: {
      bodyFont: "garamond",
      headingFont: "playfair",
      baseFontSize: 11.2,
      khmerScale: 0.93,
      nameSize: 2.1,
      nameWeight: 400,
      nameCase: "upper",
      nameTracking: 0.16,
      headingSize: 0.8,
      headingWeight: 400,
      titleWeight: 700,
    },
    style: {
      header: "center",
      heading: "caps",
      headingAlign: "center",
      entry: "date-below",
      density: "airy",
      contactSeparator: "slash",
      subtitleItalic: true,
    },
  }),
  define({
    id: "kulen",
    name: "Kulen",
    description: "Khmer-first serif: Noto Serif Khmer with dates in a left column.",
    category: "classic",
    traits: { khmerFirst: true },
    layout: { photo: "portrait" },
    typography: { bodyFont: "noto-serif-khmer", baseFontSize: 10, nameSize: 2.1, headingCase: "normal", headingSize: 1.1, titleWeight: 700 },
    colors: { primary: "#14532d" },
    style: {
      header: "rule",
      heading: "underline",
      entry: "date-left",
      skills: "rows",
      rules: "medium",
      contactSeparator: "dot",
      accent: ["name", "headings", "rules"],
    },
  }),
  define({
    id: "standard",
    name: "Standard",
    description: "ATS-friendly serif: one column, standard font, plain headings.",
    category: "classic",
    traits: { ats: true },
    typography: {
      bodyFont: "times",
      baseFontSize: 11,
      nameSize: 1.7,
      nameCase: "upper",
      headingCase: "upper",
      headingSize: 1,
      titleWeight: 700,
    },
    colors: { text: "#000000", muted: "#333333", primary: "#000000" },
    style: {
      header: "center",
      heading: "plain",
      entry: "date-right",
      entryLead: "org",
      contactSeparator: "pipe",
      accent: ["headings"],
    },
  }),
  define({
    id: "creative",
    name: "Studio",
    description: "Large grotesk name with a softly tinted side column and photo.",
    category: "creative",
    layout: { kind: "sidebar-right", headerPlacement: "main", photo: "circle", sidebarWidth: 62 },
    typography: { bodyFont: "inter", headingFont: "grotesk", baseFontSize: 9.6, nameSize: 3, nameTracking: -0.03, headingSize: 1.25 },
    style: { header: "left", heading: "plain", entry: "date-below", skills: "pills", fill: "sidebar-tint" },
  }),
  define({
    id: "monogram",
    name: "Monogram",
    description: "Your initials in an outlined square beside the name.",
    category: "creative",
    typography: { bodyFont: "inter", headingFont: "grotesk", baseFontSize: 9.8, nameSize: 2.3, nameTracking: -0.02 },
    style: { header: "monogram", heading: "overline", entry: "date-right", skills: "columns", accent: ["name", "headings", "markers"] },
  }),
  define({
    id: "index",
    name: "Index",
    description: "Numbered sections and dates in a left column, set in a geometric grotesk.",
    category: "creative",
    typography: {
      bodyFont: "grotesk",
      baseFontSize: 9.8,
      nameSize: 2.7,
      nameWeight: 500,
      nameTracking: -0.03,
      headingSize: 1.38,
      headingWeight: 500,
      dateColumn: 12,
    },
    style: { header: "split", heading: "numbered", entry: "date-left", skills: "rows", bullet: "dash", accent: ["name", "markers"] },
  }),
  define({
    id: "poster",
    name: "Poster",
    description: "An oversized name across the page, details in a narrow left column.",
    category: "creative",
    layout: { kind: "sidebar-left", headerPlacement: "full", sidebarWidth: 50 },
    typography: {
      bodyFont: "inter",
      headingFont: "grotesk",
      baseFontSize: 9.6,
      nameSize: 4.6,
      nameCase: "upper",
      nameTracking: -0.035,
      headingWeight: 600,
    },
    style: { header: "left", heading: "label", entry: "date-below", accent: ["name"] },
  }),
  define({
    id: "draft",
    name: "Draft",
    description: "Typewriter look: everything in one monospaced face.",
    category: "creative",
    typography: {
      bodyFont: "mono",
      baseFontSize: 8.8,
      nameSize: 1.8,
      nameWeight: 600,
      headingWeight: 600,
      headingSize: 0.92,
      dateColumn: 12.6,
    },
    style: { header: "left", heading: "caps", entry: "date-left", bullet: "dash", contactSeparator: "slash" },
  }),
  define({
    id: "tonle",
    name: "Tonle",
    description: "A solid band across the top carries your name; clean single column below.",
    category: "modern",
    layout: { photo: "circle" },
    typography: { bodyFont: "inter", nameSize: 2.5, nameTracking: -0.02 },
    style: { header: "banner", heading: "bar", entry: "date-right", skills: "rows", fill: "banner-dark", accent: ["headings", "markers"] },
  }),
  define({
    id: "bokor",
    name: "Bokor",
    description: "Dark side column with photo, contact and skills beside a bright main column.",
    category: "creative",
    layout: { kind: "sidebar-left", headerPlacement: "main", photo: "circle", sidebarWidth: 64 },
    typography: { bodyFont: "dm-sans", baseFontSize: 9.6, nameSize: 2.6, nameTracking: -0.02 },
    colors: { primary: "#1f2933" },
    style: { header: "left", heading: "underline", entry: "date-below", fill: "sidebar-dark", accent: ["name", "headings", "rules"] },
  }),
  define({
    id: "bayon",
    name: "Bayon",
    description: "Khmer-first with a photo: Moul name on a soft band, Hanuman text in two columns.",
    category: "creative",
    traits: { khmerFirst: true },
    layout: { kind: "split", photo: "rounded" },
    typography: {
      bodyFont: "hanuman",
      headingFont: "moul",
      baseFontSize: 9.8,
      nameSize: 1.8,
      nameWeight: 800,
      headingCase: "normal",
      headingSize: 1.12,
      headingWeight: 800,
      titleWeight: 700,
    },
    colors: { primary: "#3b3632" },
    style: { header: "banner", heading: "caps", entry: "date-below", fill: "banner-tint", contactSeparator: "dot" },
  }),
];

export const DEFAULT_TEMPLATE_ID = templates[0]!.id;

/** Unknown ids fall back to the default so a CV always renders. */
export function getTemplate(id: string | undefined): CVTemplate {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}

export function isFontKey(value: string): value is FontKey {
  return Object.prototype.hasOwnProperty.call(FONT_STACKS, value);
}

/** True when the template paints to the paper edge (filled sidebar or banner). */
export function isFullBleed(template: CVTemplate): boolean {
  return template.style.fill !== "none";
}

/**
 * The design axes of a template as one string, ignoring names and colours.
 * Two templates with the same signature would be the same design.
 */
export function templateSignature(t: CVTemplate): string {
  const { layout: l, typography: ty, style: s } = t;
  return [
    templateStructure(t),
    l.photo,
    l.divider ? "divider" : "",
    s.headingAlign,
    s.entryLead,
    s.skills,
    s.density,
    s.rules,
    s.bullet,
    s.contactSeparator,
    s.subtitleItalic ? "italic" : "",
    [...s.accent].sort().join("+"),
    `${ty.nameFont}/${ty.headingFont}/${ty.bodyFont}`,
    `${ty.nameSize}/${ty.nameWeight}/${ty.nameCase}`,
    `${ty.headingCase}/${ty.headingSize}/${ty.headingWeight}`,
  ].join("|");
}

/**
 * The coarse structure only: page layout, header, section headings, date
 * placement and fills. Every template differs from every other here, so no two
 * are the same skeleton in different fonts.
 */
export function templateStructure(t: CVTemplate): string {
  const { layout: l, style: s } = t;
  return [l.kind, l.sidebar ? l.headerPlacement : "", s.header, s.heading, s.entry, s.fill].join("|");
}

/* ---------- Colour helpers ---------- */

const HEX = /^#[0-9a-fA-F]{6}$/;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix `amount` (0–1) of `a` into `b`. */
export function mixColor(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const ch = (x: number, y: number) =>
    Math.round(x * amount + y * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black, whichever reads better on the given fill. */
export function readableOn(fill: string): string {
  const l = luminance(fill);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastDark = (l + 0.05) / (luminance("#111111") + 0.05);
  return contrastWhite >= contrastDark ? "#ffffff" : "#111111";
}

/** Effective look after applying the CV's own color/font overrides to a template. */
export function resolveAppearance(
  template: CVTemplate,
  appearance: { primaryColor: string; fontFamily: string },
) {
  const primary = HEX.test(appearance.primaryColor) ? appearance.primaryColor.toLowerCase() : template.colors.primary;
  const override = isFontKey(appearance.fontFamily) ? appearance.fontFamily : null;
  const onPrimary = readableOn(primary);
  const { fill } = template.style;
  const { text, muted, rule, background } = template.colors;

  // Filled areas derive from the accent so a colour override recolours them too.
  const dark = fill === "sidebar-dark" || fill === "banner-dark";
  const tint = fill === "sidebar-tint" || fill === "banner-tint";
  const fillBackground = dark ? primary : tint ? mixColor(primary, background, 0.07) : background;
  const fillText = dark ? onPrimary : text;
  const fillMuted = dark ? mixColor(onPrimary, primary, 0.78) : muted;
  const fillRule = dark ? mixColor(onPrimary, primary, 0.35) : tint ? mixColor(primary, background, 0.22) : rule;

  return {
    primary,
    /** Text colour that reads on a fill of the accent. */
    onPrimary,
    bodyFont: override ?? template.typography.bodyFont,
    headingFont: override ?? template.typography.headingFont,
    nameFont: override ?? template.typography.nameFont,
    /** Colours inside the filled sidebar or banner (equal to the page colours when there is no fill). */
    fill: { background: fillBackground, text: fillText, muted: fillMuted, rule: fillRule },
  };
}
