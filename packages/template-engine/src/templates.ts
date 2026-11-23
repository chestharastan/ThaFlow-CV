import { SECTION_KEYS, type CVLanguage, type SectionKey } from "@thaflow/cv-core";

export type TemplateCategory = "professional" | "student" | "academic" | "creative";
export type LayoutKind = "single" | "sidebar-left" | "sidebar-right" | "banner";
export type HeadingStyle = "underline" | "bar" | "caps" | "boxed" | "plain";

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  supportedLanguages: CVLanguage[];
  layout: {
    kind: LayoutKind;
    columns: number;
    sidebar: boolean;
    photo: boolean;
  };
  typography: {
    /** Keys into FONT_STACKS. */
    headingFont: FontKey;
    bodyFont: FontKey;
    /** Points. */
    baseFontSize: number;
  };
  colors: {
    primary: string;
    text: string;
    muted: string;
    background: string;
    sidebarBackground?: string;
    sidebarText?: string;
  };
  style: {
    headerAlign: "left" | "center";
    heading: HeadingStyle;
    /** Put dates in a left-hand column (academic style). */
    dateColumn?: boolean;
    /** Render skills as pills instead of a comma list. */
    skillPills?: boolean;
  };
  supportedSections: SectionKey[];
}

/**
 * Every stack ends with Khmer-capable fonts so mixed Khmer/English text never
 * falls back to a font without Khmer shaping.
 */
export const FONT_STACKS = {
  sans: `"Helvetica Neue", Arial, "Noto Sans Khmer", "Khmer OS Battambang", system-ui, sans-serif`,
  serif: `Georgia, "Times New Roman", "Noto Serif Khmer", "Noto Sans Khmer", serif`,
  mono: `"SF Mono", Menlo, Consolas, "Noto Sans Khmer", monospace`,
  "noto-khmer": `"Noto Sans Khmer", "Helvetica Neue", Arial, sans-serif`,
  kantumruy: `"Kantumruy Pro", "Noto Sans Khmer", "Helvetica Neue", Arial, sans-serif`,
  battambang: `"Battambang", "Noto Sans Khmer", Georgia, serif`,
} as const;
export type FontKey = keyof typeof FONT_STACKS;

export const FONT_OPTIONS: { key: FontKey; label: string; docxFont: string }[] = [
  { key: "sans", label: "Sans-serif", docxFont: "Arial" },
  { key: "serif", label: "Serif", docxFont: "Georgia" },
  { key: "noto-khmer", label: "Noto Sans Khmer", docxFont: "Noto Sans Khmer" },
  { key: "kantumruy", label: "Kantumruy Pro", docxFont: "Kantumruy Pro" },
  { key: "battambang", label: "Battambang", docxFont: "Battambang" },
  { key: "mono", label: "Monospace", docxFont: "Consolas" },
];

export const COLOR_PRESETS = ["#1f2937", "#1d4ed8", "#0f766e", "#b45309", "#9d174d", "#6d28d9", "#b91c1c", "#0369a1"];

const both: CVLanguage[] = ["en", "km"];
const all = [...SECTION_KEYS];
const base = { text: "#1f2937", muted: "#6b7280", background: "#ffffff" };

export const templates: CVTemplate[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple and clean",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "sans", bodyFont: "sans", baseFontSize: 10 },
    colors: { ...base, primary: "#111827" },
    style: { headerAlign: "left", heading: "caps" },
    supportedSections: all,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary two-column design",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "sidebar-left", columns: 2, sidebar: true, photo: true },
    typography: { headingFont: "sans", bodyFont: "sans", baseFontSize: 9.5 },
    colors: { ...base, primary: "#1d4ed8", sidebarBackground: "#1e293b", sidebarText: "#f1f5f9" },
    style: { headerAlign: "left", heading: "bar", skillPills: true },
    supportedSections: all,
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Traditional business",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "serif", bodyFont: "serif", baseFontSize: 10.5 },
    colors: { ...base, primary: "#1e3a5f" },
    style: { headerAlign: "center", heading: "underline" },
    supportedSections: all,
  },
  {
    id: "graduate",
    name: "Graduate",
    description: "Students and fresh graduates",
    category: "student",
    supportedLanguages: both,
    layout: { kind: "banner", columns: 1, sidebar: false, photo: true },
    typography: { headingFont: "sans", bodyFont: "sans", baseFontSize: 10 },
    colors: { ...base, primary: "#0f766e" },
    style: { headerAlign: "left", heading: "bar", skillPills: true },
    supportedSections: all,
  },
  {
    id: "academic",
    name: "Academic",
    description: "Researchers and lecturers",
    category: "academic",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "serif", bodyFont: "serif", baseFontSize: 10.5 },
    colors: { ...base, primary: "#111827" },
    style: { headerAlign: "center", heading: "underline", dateColumn: true },
    supportedSections: all,
  },
  {
    id: "technical",
    name: "Technical",
    description: "Developers and engineers",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "mono", bodyFont: "sans", baseFontSize: 9.5 },
    colors: { ...base, primary: "#0369a1" },
    style: { headerAlign: "left", heading: "boxed", skillPills: true },
    supportedSections: all,
  },
  {
    id: "creative",
    name: "Creative",
    description: "Design and creative careers",
    category: "creative",
    supportedLanguages: both,
    layout: { kind: "sidebar-right", columns: 2, sidebar: true, photo: true },
    typography: { headingFont: "sans", bodyFont: "sans", baseFontSize: 9.5 },
    colors: { ...base, primary: "#9d174d", sidebarBackground: "#fdf2f8", sidebarText: "#1f2937" },
    style: { headerAlign: "left", heading: "plain", skillPills: true },
    supportedSections: all,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Senior professionals",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "banner", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "serif", bodyFont: "sans", baseFontSize: 10 },
    colors: { ...base, primary: "#1f2937" },
    style: { headerAlign: "center", heading: "underline" },
    supportedSections: all,
  },
  {
    id: "ats",
    name: "ATS-friendly",
    description: "Simple machine-readable layout",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: false },
    typography: { headingFont: "sans", bodyFont: "sans", baseFontSize: 10.5 },
    colors: { ...base, primary: "#000000", text: "#000000", muted: "#333333" },
    style: { headerAlign: "left", heading: "plain" },
    supportedSections: all,
  },
  {
    id: "bilingual",
    name: "Bilingual",
    description: "Khmer and English content",
    category: "professional",
    supportedLanguages: both,
    layout: { kind: "single", columns: 1, sidebar: false, photo: true },
    typography: { headingFont: "kantumruy", bodyFont: "kantumruy", baseFontSize: 10.5 },
    colors: { ...base, primary: "#b45309" },
    style: { headerAlign: "left", heading: "bar" },
    supportedSections: all,
  },
];

export const DEFAULT_TEMPLATE_ID = "minimal";

/** Unknown ids fall back to the default so a CV always renders. */
export function getTemplate(id: string | undefined): CVTemplate {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}

export function isFontKey(value: string): value is FontKey {
  return value in FONT_STACKS;
}

/** Effective look after applying the CV's own color/font overrides to a template. */
export function resolveAppearance(
  template: CVTemplate,
  appearance: { primaryColor: string; fontFamily: string },
) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(appearance.primaryColor)
    ? appearance.primaryColor
    : template.colors.primary;
  const override = isFontKey(appearance.fontFamily) ? appearance.fontFamily : null;
  return {
    primary,
    bodyFont: override ?? template.typography.bodyFont,
    headingFont: override ?? template.typography.headingFont,
  };
}
