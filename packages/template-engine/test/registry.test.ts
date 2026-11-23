import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_FONTS,
  COLOR_PRESETS,
  DEFAULT_TEMPLATE_ID,
  FONT_INFO,
  FONT_OPTIONS,
  FONT_STACKS,
  TEMPLATE_CATEGORIES,
  getTemplate,
  isColourful,
  isFullBleed,
  readableOn,
  resolveAppearance,
  templateSignature,
  templateStructure,
  templates,
  type CVTemplate,
  type FontKey,
} from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");

const LEGACY_IDS = ["minimal", "modern", "corporate", "graduate", "academic", "technical", "creative", "executive", "ats", "bilingual"];
const KHMER_FAMILIES = ["Noto Sans Khmer", "Noto Serif Khmer", "Kantumruy Pro", "Battambang", "Hanuman", "Moul"];
const KHMER_FIRST_KEYS: FontKey[] = ["moul", "kantumruy", "battambang", "hanuman", "noto-khmer", "noto-serif-khmer"];
const fontKeysOf = (t: CVTemplate): FontKey[] => [t.typography.nameFont, t.typography.headingFont, t.typography.bodyFont];
const count = (predicate: (t: CVTemplate) => boolean) => templates.filter(predicate).length;

describe("template registry", () => {
  it("has exactly 30 templates with unique ids and names", () => {
    expect(templates).toHaveLength(30);
    expect(new Set(templates.map((t) => t.id)).size).toBe(30);
    expect(new Set(templates.map((t) => t.name)).size).toBe(30);
  });

  it("gives every template a one-word name and a short English description", () => {
    for (const t of templates) {
      expect(t.id, t.id).toMatch(/^[a-z]+$/);
      expect(t.name, t.id).toMatch(/^[A-Z][a-z]+$/);
      expect(t.description.length, t.id).toBeGreaterThan(15);
      expect(t.description.length, t.id).toBeLessThan(100);
      // eslint-disable-next-line no-control-regex
      expect(t.description, t.id).toMatch(/^[\x00-\x7F]+$/);
      expect(t.supportedLanguages).toEqual(["en", "km"]);
    }
  });

  it("spreads the templates over the four categories, at least five in each", () => {
    for (const t of templates) expect(TEMPLATE_CATEGORIES, t.id).toContain(t.category);
    for (const category of TEMPLATE_CATEGORIES) {
      expect(count((t) => t.category === category), category).toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps the ten original ids so saved CVs keep their choice", () => {
    for (const id of LEGACY_IDS) expect(getTemplate(id).id).toBe(id);
  });

  it("uses the first template as the default and as the fallback for unknown ids", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe("minimal");
    expect(templates[0]!.id).toBe(DEFAULT_TEMPLATE_ID);
    expect(getTemplate("no-such-template")).toBe(templates[0]);
    expect(getTemplate(undefined)).toBe(templates[0]);
    expect(getTemplate("")).toBe(templates[0]);
  });

  it("offers both: plain black-on-white designs and designs that carry colour", () => {
    // People who want it simple still have it; the gallery as a whole is not thirty near-identical pages.
    expect(count((t) => !isColourful(t) && ["#111111", "#000000"].includes(t.colors.primary))).toBeGreaterThanOrEqual(6);
    expect(count((t) => isColourful(t))).toBeGreaterThanOrEqual(10);
    expect(count((t) => t.colors.primary !== "#111111" && t.colors.primary !== "#000000")).toBeGreaterThanOrEqual(18);
    expect(new Set(templates.map((t) => t.colors.primary)).size).toBeGreaterThanOrEqual(16);
    for (const t of templates) expect(t.colors.background, t.id).toBe("#ffffff");
    // The first screen of the gallery shows the range.
    expect(templates.slice(0, 8).filter(isColourful).length).toBeGreaterThanOrEqual(4);
  });

  it("mixes one- and two-column layouts, with at least six two-column", () => {
    expect(count((t) => t.layout.columns === 2)).toBeGreaterThanOrEqual(6);
    expect(count((t) => t.layout.columns === 1)).toBeGreaterThanOrEqual(15);
    for (const t of templates) {
      const twoColumn = t.layout.kind === "split" || t.layout.kind === "sidebar-left" || t.layout.kind === "sidebar-right";
      expect(t.layout.columns, t.id).toBe(twoColumn ? 2 : 1);
      expect(t.layout.sidebar, t.id).toBe(t.layout.kind.startsWith("sidebar"));
    }
  });

  it("has at least two ATS templates: one column, plain headings, no decoration, standard fonts", () => {
    const ats = templates.filter((t) => t.traits.ats);
    expect(ats.length).toBeGreaterThanOrEqual(2);
    for (const t of ats) {
      expect(t.layout.kind, t.id).toBe("single");
      expect(t.style.heading, t.id).toBe("plain");
      expect(t.style.fill, t.id).toBe("none");
      expect(t.layout.photo, t.id).toBe("none");
      expect(["left", "center"], t.id).toContain(t.style.header);
      expect(["date-right", "date-below"], t.id).toContain(t.style.entry);
      expect(t.style.skills, t.id).toBe("list");
      // System fonts every machine and parser knows.
      for (const key of fontKeysOf(t)) expect(["sans", "times"], t.id).toContain(key);
    }
  });

  it("has at least four Khmer-first templates and one for mixed Khmer/English", () => {
    const khmerFirst = templates.filter((t) => t.traits.khmerFirst);
    expect(khmerFirst.length).toBeGreaterThanOrEqual(4);
    for (const t of khmerFirst) {
      for (const key of fontKeysOf(t)) expect(KHMER_FIRST_KEYS, `${t.id}: ${key}`).toContain(key);
    }
    const bilingual = templates.filter((t) => t.traits.bilingual);
    expect(bilingual.length).toBeGreaterThanOrEqual(1);
    for (const t of bilingual) {
      // One family that draws both scripts, so mixed lines keep an even colour.
      expect(KHMER_FIRST_KEYS, t.id).toContain(t.typography.bodyFont);
    }
  });

  it("offers a photo slot on some templates and not on most", () => {
    const withPhoto = count((t) => t.layout.photo !== "none");
    expect(withPhoto).toBeGreaterThanOrEqual(5);
    expect(withPhoto).toBeLessThan(15);
  });

  it("gives every default colour enough weight to carry white text", () => {
    for (const t of templates) {
      expect(t.colors.primary, t.id).toMatch(/^#[0-9a-f]{6}$/);
      // Dark enough for a filled band or sidebar, so it also reads as text on white.
      expect(readableOn(t.colors.primary), t.id).toBe("#ffffff");
    }
  });
});

describe("template designs", () => {
  it("no two templates share a design signature", () => {
    const seen = new Map<string, string>();
    for (const t of templates) {
      const signature = templateSignature(t);
      expect(seen.get(signature), `${t.id} duplicates ${seen.get(signature)}`).toBeUndefined();
      seen.set(signature, t.id);
    }
  });

  it("no two templates share a structure (layout, header, headings, date placement, fill), whatever their fonts", () => {
    const seen = new Map<string, string>();
    for (const t of templates) {
      const structure = templateStructure(t);
      expect(seen.get(structure), `${t.id} has the structure of ${seen.get(structure)}`).toBeUndefined();
      seen.set(structure, t.id);
    }
  });

  it("uses every major axis value somewhere, so the set is genuinely varied", () => {
    const used = <T>(pick: (t: CVTemplate) => T) => new Set(templates.map(pick));
    expect(used((t) => t.layout.kind)).toEqual(new Set(["single", "sidebar-left", "sidebar-right", "split", "label"]));
    expect(used((t) => t.style.header)).toEqual(new Set(["left", "center", "split", "rule", "boxed", "monogram", "banner"]));
    expect(used((t) => t.style.entry)).toEqual(new Set(["date-right", "date-left", "date-below", "timeline"]));
    expect(used((t) => t.style.skills)).toEqual(new Set(["list", "rows", "pills", "columns"]));
    expect(used((t) => t.style.density)).toEqual(new Set(["compact", "regular", "airy"]));
    expect(used((t) => t.style.heading).size).toBeGreaterThanOrEqual(10);
    expect(used((t) => t.typography.bodyFont).size).toBeGreaterThanOrEqual(10);
  });

  it("keeps fills and structure consistent", () => {
    for (const t of templates) {
      const { fill, header } = t.style;
      expect(header === "banner", t.id).toBe(fill === "banner-dark" || fill === "banner-tint");
      if (fill === "sidebar-dark" || fill === "sidebar-tint") {
        expect(t.layout.sidebar, t.id).toBe(true);
        // A filled sidebar runs the full height of the page, so the name cannot span above it.
        expect(t.layout.headerPlacement, t.id).not.toBe("full");
      }
      expect(t.layout.sidebarWidth, t.id).toBeGreaterThanOrEqual(46);
      expect(t.layout.sidebarWidth, t.id).toBeLessThanOrEqual(70);
      expect(t.typography.baseFontSize, t.id).toBeGreaterThanOrEqual(8.5);
      expect(t.typography.baseFontSize, t.id).toBeLessThanOrEqual(11.5);
    }
  });

  it("uses the accent colour somewhere in every template, so a person's colour choice always shows", () => {
    for (const t of templates) {
      const dark = t.style.fill === "sidebar-dark" || t.style.fill === "banner-dark";
      expect(t.style.accent.length > 0 || dark, t.id).toBe(true);
    }
  });
});

describe("appearance overrides", () => {
  it("applies the person's colour and font to every template", () => {
    for (const t of templates) {
      const look = resolveAppearance(t, { primaryColor: "#9A3412", fontFamily: "kantumruy" });
      expect(look.primary, t.id).toBe("#9a3412");
      expect(look.bodyFont, t.id).toBe("kantumruy");
      expect(look.headingFont, t.id).toBe("kantumruy");
      expect(look.nameFont, t.id).toBe("kantumruy");
    }
  });

  it("falls back to the template's own look for empty or invalid values", () => {
    for (const t of templates) {
      for (const appearance of [
        { primaryColor: "", fontFamily: "" },
        { primaryColor: "red", fontFamily: "Comic Sans" },
        { primaryColor: "#12", fontFamily: "toString" },
      ]) {
        const look = resolveAppearance(t, appearance);
        expect(look.primary, t.id).toBe(t.colors.primary);
        expect(look.bodyFont, t.id).toBe(t.typography.bodyFont);
        expect(look.headingFont, t.id).toBe(t.typography.headingFont);
      }
    }
  });

  it("recolours filled areas with the accent and keeps their text readable", () => {
    const bokor = getTemplate("bokor");
    const dark = resolveAppearance(bokor, { primaryColor: "#14532d", fontFamily: "" });
    expect(dark.fill.background).toBe("#14532d");
    expect(dark.fill.text).toBe("#ffffff");
    const light = resolveAppearance(bokor, { primaryColor: "#fde68a", fontFamily: "" });
    expect(light.fill.text).toBe("#111111");
    const tinted = resolveAppearance(getTemplate("kampot"), { primaryColor: "#14532d", fontFamily: "" });
    expect(tinted.fill.background).not.toBe("#ffffff");
    expect(readableOn(tinted.fill.background)).toBe("#111111");
    const plain = resolveAppearance(getTemplate("minimal"), { primaryColor: "#14532d", fontFamily: "" });
    expect(plain.fill.background).toBe("#ffffff");
  });

  it("leads the colour presets with black and gray, then the accents", () => {
    expect(COLOR_PRESETS[0]).toBe("#111111");
    const saturation = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return Math.max(...c) - Math.min(...c);
    };
    expect(COLOR_PRESETS.slice(0, 2).every((c) => saturation(c) <= 30)).toBe(true);
    expect(COLOR_PRESETS.slice(2).every((c) => saturation(c) > 30)).toBe(true);
    expect(new Set(COLOR_PRESETS).size).toBe(COLOR_PRESETS.length);
    for (const color of COLOR_PRESETS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
      expect(readableOn(color), color).toBe("#ffffff");
    }
    // Every template's own default is offered, so "back to the default colour" is always one click.
    for (const t of templates) {
      if (t.colors.primary !== "#000000") expect(COLOR_PRESETS, t.id).toContain(t.colors.primary);
    }
  });
});

describe("fonts", () => {
  const cvFonts = readFileSync(join(repo, "apps/web/app/cv-fonts.ts"), "utf8");
  const imports = [...cvFonts.matchAll(/^import "([^"]+)";$/gm)].map((m) => m[1]!);
  const usedKeys = new Set<FontKey>([...templates.flatMap(fontKeysOf), ...FONT_OPTIONS.map((f) => f.key)]);

  it("every font a template uses is a known stack", () => {
    for (const t of templates) {
      for (const key of fontKeysOf(t)) expect(Object.keys(FONT_STACKS), `${t.id}: ${key}`).toContain(key);
    }
  });

  it("every stack ends with Khmer-capable fonts and a generic family", () => {
    for (const [key, stack] of Object.entries(FONT_STACKS)) {
      const families = stack.split(",").map((f) => f.trim().replace(/^"|"$/g, ""));
      expect(["serif", "sans-serif", "monospace"], key).toContain(families.at(-1));
      const khmerAt = families.findIndex((f) => KHMER_FAMILIES.includes(f));
      expect(khmerAt, `${key} has no Khmer font`).toBeGreaterThanOrEqual(0);
      // A bundled Khmer font, not only a system one that may be missing.
      expect(FONT_INFO[key as FontKey].bundled.some((f) => KHMER_FAMILIES.includes(f)), key).toBe(true);
      // Every bundled family the stack relies on is actually named in it.
      for (const family of FONT_INFO[key as FontKey].bundled) expect(families, `${key}: ${family}`).toContain(family);
    }
  });

  it("Khmer-first stacks start with a Khmer family that brings its own Latin", () => {
    for (const key of KHMER_FIRST_KEYS.filter((k) => k !== "moul")) {
      const first = FONT_STACKS[key].split(",")[0]!.trim().replace(/^"|"$/g, "");
      expect(KHMER_FAMILIES, key).toContain(first);
      // The per-weight stylesheet carries both subsets (the subset-only files would be "khmer-400.css").
      expect(BUNDLED_FONTS[first]!.files.every((f) => /^\d{3}\.css$/.test(f)), key).toBe(true);
    }
    // Moul has no refined Latin of its own, so the stack puts a Latin display face first.
    expect(FONT_STACKS.moul.startsWith(`"Playfair Display", "Moul"`)).toBe(true);
  });

  it("cv-fonts.ts imports every family and weight the templates and font options use", () => {
    for (const key of usedKeys) {
      for (const family of FONT_INFO[key].bundled) {
        const font = BUNDLED_FONTS[family];
        expect(font, `${key}: ${family} is not in BUNDLED_FONTS`).toBeDefined();
        for (const file of font!.files) expect(imports, `${key}: ${family}`).toContain(`${font!.package}/${file}`);
      }
    }
  });

  it("cv-fonts.ts and BUNDLED_FONTS list exactly the same stylesheets, all of which exist", () => {
    const expected = Object.values(BUNDLED_FONTS).flatMap((font) => font.files.map((file) => `${font.package}/${file}`));
    expect([...imports].sort()).toEqual([...expected].sort());
    for (const specifier of expected) {
      expect(existsSync(join(repo, "apps/web/node_modules", specifier)), specifier).toBe(true);
    }
    // Nothing is bundled without being used.
    const usedFamilies = new Set([...usedKeys].flatMap((key) => FONT_INFO[key].bundled));
    expect(Object.keys(BUNDLED_FONTS).sort()).toEqual([...usedFamilies].sort());
  });

  it("font options stay in step with the stacks and their Word fonts", () => {
    expect(new Set(FONT_OPTIONS.map((f) => f.key)).size).toBe(FONT_OPTIONS.length);
    for (const option of FONT_OPTIONS) {
      expect(Object.keys(FONT_STACKS)).toContain(option.key);
      expect(option.label.length).toBeGreaterThan(2);
      expect(option.docxFont).toBe(FONT_INFO[option.key].docx.latin);
      expect(KHMER_FAMILIES, option.key).toContain(option.docxKhmerFont);
    }
    // The six keys saved CVs may already hold are still offered.
    for (const key of ["sans", "serif", "noto-khmer", "kantumruy", "battambang", "mono"]) {
      expect(FONT_OPTIONS.map((f) => f.key)).toContain(key);
    }
  });
});
