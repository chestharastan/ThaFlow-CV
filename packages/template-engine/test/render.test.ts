import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";
import { getCVLabels } from "@thaflow/localization";
import {
  CVPreview,
  DENSITY,
  FONT_STACKS,
  contactLines,
  contactRows,
  countPages,
  educationLines,
  experienceLines,
  getPageCss,
  getTemplate,
  getVisibleSections,
  initialsOf,
  isFullBleed,
  langOf,
  parseDescription,
  placeSections,
  printCss,
  templateCss,
  templates,
  type CVTemplate,
} from "../src";
import { TINY_PHOTO, fullEnglishCV, fullKhmerCV, longCV, mixedCV, stressCV } from "./fixtures";

const render = (cv: CVDocument, template?: CVTemplate, pageStyle = false) =>
  renderToStaticMarkup(createElement(CVPreview, { cv, template, pageStyle }));
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

/** Something from every section of the full English CV: no template may drop content. */
const ENGLISH_CONTENT = [
  "Sophea Chan",
  "Senior Product Manager",
  "sophea.chan@example.com",
  "+855 12 345 678",
  "linkedin.com/in/sopheachan",
  "Product manager with eight years",
  "Tonle Digital",
  "Mar 2021 – Present",
  "Cut new-account sign-up time",
  "Technologies: Figma, SQL, Amplitude",
  "Royal University of Phnom Penh",
  "Master of Business Administration",
  "BSc, Computer Science",
  "Roadmapping",
  "Stakeholder management",
  "QR payments",
  "Certified Scrum Product Owner",
  "Scrum Alliance",
  "Fluent",
  "Employee of the Year",
  "Vibol Kim",
  "vibol.kim@example.com",
  "Volunteering",
  "Volunteer teacher",
];

describe("CVPreview renders every template", () => {
  const cases: [string, () => CVDocument][] = [
    ["a full English CV", () => fullEnglishCV()],
    ["a full Khmer CV", () => fullKhmerCV()],
    ["a CV with every section and a photo", () => fullEnglishCV({ photo: TINY_PHOTO })],
    ["a mixed Khmer/English CV", () => mixedCV({ photo: TINY_PHOTO })],
    ["awkward, very long content", () => stressCV()],
    ["a long multi-page CV", () => longCV(fullKhmerCV({ photo: TINY_PHOTO }))],
    ["an empty CV", () => createEmptyCV()],
  ];

  for (const [label, make] of cases) {
    it(`with ${label}`, () => {
      for (const template of templates) {
        const cv = make();
        const html = render(cv, template);
        expect(html, template.id).toContain(`data-template="${template.id}"`);
        expect(html, template.id).toContain(`lang="${cv.metadata.language}"`);
        if (cv.personal.fullName) expect(html, template.id).toContain(escapeHtml(cv.personal.fullName));
        // Printed copies render too.
        expect(render(cv, template, true), template.id).toContain("@page");
      }
    });
  }

  it("uses the CV's own template by default and falls back for unknown ids", () => {
    const cv = fullEnglishCV();
    cv.appearance.templateId = "angkor";
    expect(render(cv)).toContain('data-template="angkor"');
    cv.appearance.templateId = "deleted-template";
    expect(render(cv)).toContain(`data-template="${templates[0]!.id}"`);
  });
});

describe("content", () => {
  it("every template shows every section of the CV", () => {
    const labels = getCVLabels("en");
    for (const template of templates) {
      const html = render(fullEnglishCV(), template);
      for (const text of ENGLISH_CONTENT) expect(html, `${template.id}: ${text}`).toContain(escapeHtml(text));
      for (const key of ["summary", "experiences", "education", "skills", "projects", "certifications", "languages", "awards", "references"] as const) {
        expect(html, `${template.id}: ${key}`).toContain(`>${labels.sections[key]}<`);
      }
    }
  });

  it("every template shows the Khmer CV with Khmer section labels", () => {
    const labels = getCVLabels("km");
    for (const template of templates) {
      const html = render(fullKhmerCV(), template);
      for (const text of ["ចាន់ សុភា", "ប្រធានគ្រប់គ្រងផលិតផលជាន់ខ្ពស់", "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ", "ការស្រាវជ្រាវអ្នកប្រើប្រាស់", "លោក គឹម វិបុល", "សកម្មភាពស្ម័គ្រចិត្ត"]) {
        expect(html, `${template.id}: ${text}`).toContain(text);
      }
      expect(html, template.id).toContain(`>${labels.sections.experiences}<`);
      expect(html, template.id).toContain(`>${labels.sections.education}<`);
    }
  });

  it("leads entries with the role or the organisation, as the template asks", () => {
    const cv = fullEnglishCV();
    expect(experienceLines(cv.experiences[0]!, "role")).toEqual({ title: "Senior Product Manager", subtitle: "Tonle Digital · Phnom Penh" });
    expect(experienceLines(cv.experiences[0]!, "org")).toEqual({ title: "Tonle Digital", subtitle: "Senior Product Manager · Phnom Penh" });
    expect(educationLines(cv.education[1]!, "role").title).toBe("BSc, Computer Science");
    expect(educationLines(cv.education[1]!, "org")).toEqual({
      title: "Institute of Technology of Cambodia",
      subtitle: "BSc, Computer Science · Phnom Penh",
    });
    // A missing lead never leaves the entry without a title.
    const partial = { ...cv.experiences[0]!, position: "" };
    expect(experienceLines(partial, "role")).toEqual({ title: "Tonle Digital", subtitle: "Phnom Penh" });
    expect(experienceLines({ ...cv.experiences[0]!, company: "" }, "org").title).toBe("Senior Product Manager");
  });

  it("hides empty and hidden sections and keeps the CV's section order", () => {
    const cv = fullEnglishCV();
    cv.appearance.hiddenSections = ["references", "awards"];
    cv.appearance.sectionOrder = ["education", "experiences", ...cv.appearance.sectionOrder.filter((s) => s !== "education" && s !== "experiences")];
    cv.projects = [];
    for (const template of templates) {
      expect(getVisibleSections(cv, template)).not.toContain("references");
      expect(getVisibleSections(cv, template)).not.toContain("projects");
      const html = render(cv, template);
      expect(html, template.id).not.toContain("Vibol Kim");
      expect(html, template.id).not.toContain(">Projects<");
      if (template.layout.columns === 1) {
        expect(html.indexOf(">Education<"), template.id).toBeLessThan(html.indexOf(">Experience<"));
      }
    }
  });

  it("escapes markup in user content", () => {
    const cv = fullEnglishCV();
    cv.summary = 'Uses <script>alert("x")</script> & more';
    cv.personal.fullName = '<img src=x onerror="alert(1)">';
    for (const template of templates) {
      const html = render(cv, template);
      expect(html, template.id).not.toContain("<script>");
      expect(html, template.id).not.toContain("<img src=x");
    }
  });

  it("parses descriptions into paragraphs and bullets", () => {
    expect(parseDescription("Intro\n- one\n* two\n• three\n\nOutro")).toEqual({ paragraphs: ["Intro", "Outro"], bullets: ["one", "two", "three"] });
    expect(parseDescription(undefined)).toEqual({ paragraphs: [], bullets: [] });
  });
});

describe("photo", () => {
  it("is shown only when the template has a slot and the person added a photo", () => {
    for (const template of templates) {
      const withPhoto = render(fullEnglishCV({ photo: TINY_PHOTO }), template);
      const without = render(fullEnglishCV(), template);
      expect(withPhoto.includes("<img"), template.id).toBe(template.layout.photo !== "none");
      expect(without.includes("<img"), template.id).toBe(false);
      expect(withPhoto.includes("cv--has-photo"), template.id).toBe(template.layout.photo !== "none");
    }
  });

  it("never renders a remote or non-image URL", () => {
    for (const photo of ["https://example.com/me.png", "data:text/html;base64,PGI+", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz4="]) {
      const cv = fullEnglishCV({ photo });
      for (const template of templates) expect(render(cv, template), template.id).not.toContain("<img");
    }
  });
});

describe("layout", () => {
  it("places sections into columns per layout", () => {
    const cv = fullEnglishCV();
    const single = placeSections(cv, getTemplate("minimal"));
    expect(single.twoColumn).toBe(false);
    expect(single.main).toEqual(getVisibleSections(cv, getTemplate("minimal")));

    const sidebar = placeSections(cv, getTemplate("modern"));
    expect(sidebar.twoColumn).toBe(true);
    expect(sidebar.side).toEqual(["skills", "certifications", "languages"]);
    expect(sidebar.main).not.toContain("skills");
    expect(sidebar.main[0]).toBe("summary");

    const split = placeSections(cv, getTemplate("balance"));
    expect(split.lead).toEqual(["summary"]);
    expect(split.main[0]).toBe("experiences");
    expect(split.side).toEqual(["skills", "education", "certifications", "languages", "awards"]);

    // Nothing is lost or duplicated in any layout.
    for (const template of templates) {
      const placed = placeSections(cv, template);
      expect([...placed.lead, ...placed.main, ...placed.side].sort(), template.id).toEqual([...getVisibleSections(cv, template)].sort());
    }
  });

  it("collapses a split layout to one column when one side would be empty", () => {
    const cv = fullEnglishCV();
    cv.experiences = [];
    cv.projects = [];
    cv.references = [];
    cv.customSections = [];
    for (const id of ["balance", "bayon"]) {
      const template = getTemplate(id);
      const placed = placeSections(cv, template);
      expect(placed.twoColumn, id).toBe(false);
      expect(placed.side, id).toEqual([]);
      const html = render(cv, template);
      expect(html, id).toContain("cv--one-column");
      expect(html, id).not.toContain("cv-columns");
      expect(html, id).toContain("Royal University of Phnom Penh");
    }
  });

  it("puts contact details in the sidebar on sidebar templates and in the header elsewhere", () => {
    const cv = fullEnglishCV();
    for (const template of templates) {
      const html = render(cv, template);
      expect(html.includes("cv-section--contact"), template.id).toBe(template.layout.sidebar);
      expect(html.match(/sophea\.chan@example\.com/g)?.length, template.id).toBe(1);
    }
  });

  it("groups contact details into rows", () => {
    const cv = fullEnglishCV();
    expect(contactLines(cv).map((l) => l.kind)).toEqual(["email", "phone", "location", "website", "linkedin", "github"]);
    expect(contactRows(cv).map((row) => row.map((l) => l.kind))).toEqual([
      ["email", "phone", "location"],
      ["website", "linkedin", "github"],
    ]);
    cv.personal.website = cv.personal.linkedin = cv.personal.github = "";
    expect(contactRows(cv)).toHaveLength(1);
    expect(contactRows(createEmptyCV())).toEqual([]);
    cv.personal.website = "https://example.com/";
    expect(contactLines(cv).at(-1)).toEqual({ kind: "website", value: "example.com" });
  });

  it("draws the monogram from the name's initials", () => {
    expect(initialsOf("Sophea Chan")).toBe("SC");
    expect(initialsOf("  maria de la cruz ")).toBe("MC");
    expect(initialsOf("Dara")).toBe("D");
    expect(initialsOf("ចាន់ សុភា")).toBe("ចស");
    expect(initialsOf("(Dr.) Sok Dara")).toBe("DD");
    expect(initialsOf("")).toBe("");
    expect(render(fullEnglishCV(), getTemplate("monogram"))).toContain(">SC</span>");
    expect(render(createEmptyCV(), getTemplate("monogram"))).not.toContain("cv-monogram");
  });
});

describe("appearance in the rendered CV", () => {
  it("applies the person's accent colour and font in every template", () => {
    const cv = fullEnglishCV();
    cv.appearance.primaryColor = "#9a3412";
    cv.appearance.fontFamily = "kantumruy";
    for (const template of templates) {
      const html = render(cv, template);
      expect(html, template.id).toContain("--cv-primary:#9a3412");
      const stack = escapeHtml(FONT_STACKS.kantumruy);
      expect(html, template.id).toContain(`--cv-font-body:${stack}`);
      expect(html, template.id).toContain(`--cv-font-heading:${stack}`);
      expect(html, template.id).toContain(`--cv-font-name:${stack}`);
      // The colour reaches the page: through an accent class, or through a fill.
      const usesAccent = /cv--accent-(name|headings|rules|titles|markers)/.test(html);
      expect(usesAccent || html.includes("--cv-fill-bg:#9a3412"), template.id).toBe(true);
    }
  });

  it("every accent target a template names has a rule in the stylesheet", () => {
    for (const target of new Set(templates.flatMap((t) => t.style.accent))) {
      expect(templateCss).toContain(`.cv--accent-${target} {`);
    }
  });

  it("every modifier class a template can emit is styled", () => {
    const emitted = new Set<string>();
    for (const template of templates) {
      for (const cv of [fullEnglishCV({ photo: TINY_PHOTO }), createEmptyCV()]) {
        const classes = /<article class="([^"]+)"/.exec(render(cv, template))![1]!.split(" ");
        for (const name of classes) if (name.startsWith("cv--")) emitted.add(name);
      }
    }
    // Axis values that are the unstyled default of their axis (a tinted banner is styled through
    // .cv--header-banner and the fill colour variables).
    const defaults = new Set([
      "cv--fill-banner-tint",
      "cv--layout-single", "cv--layout-split", "cv--placement-full", "cv--placement-main", "cv--placement-sidebar",
      "cv--one-column", "cv--two-column", "cv--header-left", "cv--header-monogram", "cv--heading-caps", "cv--heading-plain",
      "cv--halign-left", "cv--hcase-normal", "cv--name-normal", "cv--entry-date-right", "cv--skills-list",
      "cv--density-compact", "cv--density-regular", "cv--density-airy", "cv--photo-none", "cv--fill-none", "cv--edge-none", "cv--flow",
      "cv--rules-hair", "cv--bullet-disc", "cv--contact-dot", "cv--contact-pipe", "cv--contact-slash",
    ]);
    const unstyled = [...emitted].filter((name) => !defaults.has(name) && !templateCss.includes(`.${name}`));
    expect(unstyled).toEqual([]);
    // And the list of defaults is honest: none of them has a rule after all.
    expect([...defaults].filter((name) => new RegExp(`\\.${name}[ .:,{]`).test(templateCss))).toEqual([]);
  });
});

describe("Khmer", () => {
  it("tags Khmer text inside an English CV so the Khmer type rules reach it", () => {
    expect(langOf("ចាន់ សុភា", "en")).toBe("km");
    expect(langOf("Sophea Chan · ចាន់ សុភា", "en")).toBe("km");
    expect(langOf("Sophea Chan", "en")).toBeUndefined();
    expect(langOf("ចាន់ សុភា", "km")).toBeUndefined();
    expect(langOf(undefined, "en")).toBeUndefined();
    for (const template of templates) {
      const html = render(mixedCV(), template);
      expect(html, template.id).toMatch(/<h1 class="cv-name" lang="km">/);
      expect(html, template.id).toMatch(/<h2 class="cv-heading" lang="km">/);
      expect(html, template.id).toMatch(/class="cv-entry-title" lang="km"/);
      // English-only text is left alone.
      expect(html, template.id).toMatch(/<h2 class="cv-heading"><span class="cv-heading-text">Experience</);
    }
  });

  it("the stylesheet never letter-spaces, slants or capitalises Khmer", () => {
    const rule = /\.cv:lang\(km\), \.cv :lang\(km\) \{([^}]+)\}/.exec(templateCss)?.[1] ?? "";
    expect(rule).toContain("letter-spacing: 0 !important");
    expect(rule).toContain("font-style: normal !important");
    expect(rule).toContain("text-transform: none !important");
    expect(rule).toContain("line-height: var(--cv-leading-km)");
    // No other rule may beat that reset.
    const important = [...templateCss.matchAll(/(letter-spacing|font-style|text-transform)\s*:[^;]*!important/g)];
    expect(important).toHaveLength(3);
    // Nothing fakes a bold or an italic for a face that has none.
    expect(templateCss).toContain("font-synthesis: none");
  });

  it("gives Khmer more leading than Latin at every density, and room in names and headings", () => {
    for (const density of Object.values(DENSITY)) {
      expect(density.leadingKm).toBeGreaterThanOrEqual(1.6);
      expect(density.leadingKm - density.leading).toBeGreaterThanOrEqual(0.25);
    }
    expect(/\.cv \.cv-name:lang\(km\) \{[^}]*line-height: (\d\.\d+)/.exec(templateCss)?.[1]).toBe("1.5");
    expect(Number(/\.cv \.cv-heading:lang\(km\) \{[^}]*line-height: (\d\.\d+)/.exec(templateCss)?.[1])).toBeGreaterThanOrEqual(1.6);
  });

  it("lets long strings wrap inside columns", () => {
    expect(templateCss).toMatch(/\.cv \{[^}]*overflow-wrap: anywhere/);
    expect(templateCss).toContain(".cv-body, .cv-main, .cv-sidebar, .cv-col, .cv-lead { min-width: 0; }");
  });
});

describe("print", () => {
  it("prints text-on-white templates with real page margins and no inner padding", () => {
    // (A design with an edge stripe prints to the paper's edge instead, so the stripe reaches it.)
    for (const template of templates.filter((t) => !isFullBleed(t) && t.style.edge === "none")) {
      const css = getPageCss(template);
      const { padY, padX } = DENSITY[template.style.density];
      expect(css, template.id).toContain(`@page { size: A4; margin: ${padY}mm ${padX}mm; }`);
      expect(css, template.id).toContain(`.cv[data-template="${template.id}"] { width: auto; min-height: 0; padding: 0; }`);
      expect(css.startsWith("@media print {"), template.id).toBe(true);
    }
  });

  it("prints full-bleed templates edge to edge, keeping margins on every sheet", () => {
    const bleed = templates.filter(isFullBleed);
    expect(bleed.length).toBeGreaterThan(0);
    for (const template of bleed) {
      const css = getPageCss(template);
      expect(css, template.id).toContain("@page { size: A4; margin: 0; }");
      expect(css, template.id).toContain("box-decoration-break: clone");
      expect(css, template.id).not.toContain("padding: 0");
      if (template.layout.sidebar) expect(css, template.id).toContain("position: fixed");
    }
  });

  it("emits the page rule only when asked, next to the printed copy", () => {
    const cv = fullEnglishCV();
    for (const template of templates) {
      expect(render(cv, template), template.id).not.toContain("@page");
      const printed = render(cv, template, true);
      expect(printed.startsWith("<style>@media print {"), template.id).toBe(true);
      expect(printed.match(/@page/g), template.id).toHaveLength(1);
    }
  });

  it("keeps entries and headings from splitting across pages", () => {
    expect(templateCss).toMatch(/\.cv-entry \{[^}]*break-inside: avoid/);
    expect(templateCss).toMatch(/\.cv-heading \{[^}]*break-after: avoid/);
    expect(templateCss).toMatch(/\.cv-header \{[^}]*break-inside: avoid/);
    expect(printCss).toContain(".no-print { display: none !important; }");
    expect(printCss.trim().startsWith("@media print {")).toBe(true);
  });

  it("stays an A4 sheet on screen", () => {
    expect(templateCss).toMatch(/\.cv \{[^}]*width: 210mm;[^}]*min-height: 297mm;/);
  });
});

describe("pages on screen", () => {
  const sheet = (cv: CVDocument, template: CVTemplate, page: number) => renderToStaticMarkup(createElement(CVPreview, { cv, template, page }));

  it("shows one sheet of exactly A4, whatever the CV holds", () => {
    expect(templateCss).toMatch(/\.cv--paged \{[^}]*height: 297mm;[^}]*min-height: 0;[^}]*overflow: hidden;/);
    const cv = longCV(fullEnglishCV());
    for (const template of templates) {
      const html = sheet(cv, template, 1);
      expect(html, template.id).toMatch(/^<article class="[^"]*\bcv--paged\b[^"]*" style="[^"]*--cv-page:1"/);
      // The whole CV is laid out inside the sheet, which shows the page asked for.
      expect(html, template.id).toMatch(/data-template="[^"]+"><div class="cv-flow">/);
      for (const text of ["Sophea Chan", "Tonle Digital", "Volunteer teacher"]) expect(html, `${template.id}: ${text}`).toContain(text);
    }
  });

  it("leaves the printed copy as it was", () => {
    const html = render(fullEnglishCV(), getTemplate("minimal"));
    expect(html).not.toContain("cv--paged");
    expect(html).not.toContain("cv-flow");
    expect(html).not.toContain("--cv-page");
  });

  it("breaks sheets by the rules paper is broken by", () => {
    expect(templateCss).toMatch(/\.cv--paged :is\(\.cv-header, \.cv-entry, \.cv-skill-group, \.cv-contact\) \{ break-inside: avoid; \}/);
    expect(templateCss).toContain(".cv--paged .cv-heading { break-after: avoid; }");
    // The text area of a sheet is the page less the margins the same template prints with.
    expect(templateCss).toMatch(/\.cv--paged > \.cv-flow \{[^}]*height: calc\(297mm - 2 \* var\(--cv-pad-y\)\);/);
    expect(templateCss).toMatch(/\.cv--paged > \.cv-flow \{[^}]*column-gap: calc\(2 \* var\(--cv-pad-x\)\);/);
  });

  it("gives every sheet of a filled design its strip", () => {
    expect(templateCss).toMatch(/\.cv--paged:is\(\.cv--fill-sidebar-tint, \.cv--fill-sidebar-dark\)::before \{[^}]*width: var\(--cv-sidebar-w\);[^}]*background: var\(--cv-fill-bg\);/);
    expect(templateCss).toContain(".cv--paged.cv--layout-sidebar-left::before { left: 0; }");
    expect(templateCss).toContain(".cv--paged.cv--layout-sidebar-right::before { right: 0; }");
  });

  it("counts sheets from how far the columns run", () => {
    const flow = (clientWidth: number, scrollWidth: number, scrollHeight = 1123) =>
      ({ matches: () => true, clientWidth, clientHeight: 1123, scrollWidth, scrollHeight }) as unknown as Element;
    expect(countPages(null)).toBe(1);
    expect(countPages(flow(794, 794))).toBe(1);
    // Columns of text with page margins end one margin short of a whole sheet.
    expect(countPages(flow(794, 794 + 733))).toBe(2);
    expect(countPages(flow(794, 794 * 3))).toBe(3);
    // Not laid out yet (hidden): nothing to count.
    expect(countPages(flow(0, 0))).toBe(1);
    // Something that could not move to the next sheet runs past the bottom: say so, so it is not cut off.
    expect(countPages(flow(794, 794, 1500))).toBe(0);
  });
});
