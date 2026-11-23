import { DENSITY, isFullBleed, type CVTemplate } from "./templates";

/**
 * Stylesheet shared by every template. Templates differ only through modifier
 * classes and CSS variables set by <CVPreview>, so adding a template is
 * configuration. Inject once with <style>{templateCss}</style>.
 *
 * Khmer rules use :lang(km). The article carries the CV's language, and Khmer
 * text inside an English CV is tagged lang="km" by the renderer, so both get
 * them: no letter-spacing, no slanting, no reliance on capitals, taller lines.
 */
export const templateCss = /* css */ `
.cv {
  box-sizing: border-box;
  position: relative;
  width: 210mm;
  min-height: 297mm;
  padding: var(--cv-pad-y) var(--cv-pad-x);
  background: var(--cv-bg);
  color: var(--cv-text);
  font-family: var(--cv-font-body);
  font-size: var(--cv-font-size);
  font-weight: 400;
  font-style: normal;
  line-height: var(--cv-leading);
  letter-spacing: 0;
  text-align: left;
  text-transform: none;
  /* Never fake a bold or an italic: Khmer faces have no italic, and Moul has one weight. */
  font-synthesis: none;
  overflow-wrap: anywhere;
  counter-reset: cv-section;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  --cv-name-color: var(--cv-text);
  --cv-heading-color: var(--cv-text);
  --cv-title-color: var(--cv-text);
  --cv-marker-color: var(--cv-muted);
  --cv-rule-color: var(--cv-rule);
  --cv-rule-w: 0.25mm;
}
.cv *, .cv *::before, .cv *::after { box-sizing: border-box; }
.cv :where(h1, h2, p, ul) { margin: 0; padding: 0; }
.cv-body, .cv-main, .cv-sidebar, .cv-col, .cv-lead { min-width: 0; }

/* Where the accent colour goes. Unlisted parts stay in the text colour. */
.cv--accent-name { --cv-name-color: var(--cv-primary); }
.cv--accent-headings { --cv-heading-color: var(--cv-primary); }
.cv--accent-titles { --cv-title-color: var(--cv-primary); }
.cv--accent-markers { --cv-marker-color: var(--cv-primary); }
.cv--accent-rules { --cv-rule-color: var(--cv-primary); }
.cv--rules-medium { --cv-rule-w: 0.4mm; }
.cv--rules-heavy { --cv-rule-w: 0.8mm; }

/* ---------- Header ---------- */
.cv-header { margin-bottom: var(--cv-gap-header); break-inside: avoid; }
.cv-header-main { display: flex; align-items: center; gap: 6mm; }
.cv-name-block { flex: 1; min-width: 0; }
.cv-name {
  font-family: var(--cv-font-name);
  font-size: calc(1em * var(--cv-name-size));
  font-weight: var(--cv-name-weight);
  line-height: 1.1;
  letter-spacing: var(--cv-name-tracking);
  color: var(--cv-name-color);
  text-wrap: balance;
}
.cv--name-upper .cv-name { text-transform: uppercase; }
.cv-headline { margin-top: 1.5mm; font-size: 1.14em; line-height: 1.3; color: var(--cv-muted); text-wrap: balance; }
.cv-contact { margin-top: 2.8mm; color: var(--cv-muted); font-size: 0.95em; }
.cv-contact-part { display: inline-block; max-width: 100%; vertical-align: top; }
.cv-contact-sep { display: inline-block; padding: 0 2.2mm; opacity: 0.55; }
.cv--contact-space .cv-contact-sep { padding: 0 2.4mm; }
.cv-contact--stacked .cv-contact-item { display: block; }

.cv-photo { display: block; flex: none; width: 27mm; height: 27mm; object-fit: cover; }
.cv--photo-circle .cv-photo { border-radius: 50%; }
.cv--photo-rounded .cv-photo { border-radius: 3mm; }
.cv--photo-portrait .cv-photo { width: 25mm; height: 32mm; border-radius: 0.6mm; }
/* Left-aligned headers keep the name on the margin and put the photo on the right. */
.cv-header-main .cv-photo { order: 3; }

.cv--header-center .cv-header, .cv--header-boxed .cv-header { text-align: center; }
.cv--header-center .cv-header-main, .cv--header-boxed .cv-header-main { flex-direction: column; gap: 4mm; }
.cv--header-center .cv-header-main .cv-photo, .cv--header-boxed .cv-header-main .cv-photo { order: 0; }
.cv--header-center .cv-name-block, .cv--header-boxed .cv-name-block { flex: none; width: 100%; }

.cv--header-split .cv-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 8mm; }
.cv--header-split .cv-header-main { flex: 1; min-width: 0; }
.cv--header-split .cv-header-main .cv-photo { order: 0; }
.cv--header-split .cv-contact { flex: none; max-width: 52%; margin-top: 0; text-align: right; }
.cv--header-split:not(.cv--has-photo) .cv-contact--many { display: grid; grid-template-columns: auto auto; column-gap: 6mm; }
.cv--header-split.cv--has-photo .cv-contact { max-width: 42%; }

.cv--header-rule .cv-header-main {
  align-items: flex-end;
  padding-bottom: 3.6mm;
  border-bottom: calc(var(--cv-rule-w) * 1.5) solid var(--cv-rule-color);
}

.cv--header-boxed .cv-header { padding: 7mm 8mm 6.4mm; border: var(--cv-rule-w) solid var(--cv-rule-color); }

.cv-monogram {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18mm;
  height: 18mm;
  border: 0.55mm solid var(--cv-marker-color);
  color: var(--cv-marker-color);
  font-family: var(--cv-font-name);
  font-size: 1.75em;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
}

/* ---------- Sections and headings ---------- */
.cv-section { margin-bottom: var(--cv-gap-section); }
.cv-section:last-child { margin-bottom: 0; }
.cv-heading {
  margin-bottom: 2.4mm;
  font-family: var(--cv-font-heading);
  font-size: calc(1em * var(--cv-heading-size));
  font-weight: var(--cv-heading-weight);
  line-height: 1.3;
  color: var(--cv-heading-color);
  break-after: avoid;
  break-inside: avoid;
}
.cv--hcase-upper .cv-heading { text-transform: uppercase; letter-spacing: 0.11em; }
.cv--halign-center .cv-heading { text-align: center; }

.cv--heading-underline .cv-heading { padding-bottom: 1.1mm; border-bottom: var(--cv-rule-w) solid var(--cv-rule-color); }
.cv--heading-overline .cv-heading { padding-top: 1.7mm; border-top: var(--cv-rule-w) solid var(--cv-rule-color); }
.cv--heading-double .cv-heading {
  padding: 1mm 0;
  border-top: var(--cv-rule-w) solid var(--cv-rule-color);
  border-bottom: var(--cv-rule-w) solid var(--cv-rule-color);
}
.cv--heading-bar .cv-heading { padding-left: 2.4mm; border-left: 1.1mm solid var(--cv-marker-color); }
.cv--heading-boxed .cv-heading { display: table; padding: 0.5mm 2.2mm; border: 0.3mm solid var(--cv-heading-color); }
.cv--heading-band .cv-heading { padding: 1mm 2.6mm; border-radius: 0.9mm; background: var(--cv-primary); color: var(--cv-on-primary); }
.cv--heading-tint .cv-heading { padding: 1mm 2.6mm; border-radius: 0.9mm; background: color-mix(in srgb, var(--cv-primary) 11%, transparent); color: var(--cv-primary); }
.cv--heading-label { --cv-heading-color: var(--cv-muted); }
.cv--heading-label.cv--accent-headings { --cv-heading-color: var(--cv-primary); }
.cv--heading-center-rule .cv-heading, .cv--heading-trail .cv-heading { display: flex; align-items: center; gap: 3mm; }
.cv--heading-center-rule .cv-heading { text-align: center; }
.cv--heading-center-rule .cv-heading::before,
.cv--heading-center-rule .cv-heading::after,
.cv--heading-trail .cv-heading::after {
  content: "";
  flex: 1;
  min-width: 4mm;
  height: var(--cv-rule-w);
  background: var(--cv-rule-color);
}
.cv--heading-numbered .cv-heading { display: flex; align-items: baseline; gap: 2.6mm; letter-spacing: -0.01em; }
.cv--heading-numbered .cv-heading::before {
  counter-increment: cv-section;
  content: counter(cv-section, decimal-leading-zero);
  flex: none;
  min-width: 6.4mm;
  color: var(--cv-marker-color);
  font-size: 0.62em;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

/* ---------- Entries ---------- */
.cv-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "title date" "sub sub" "content content";
  align-items: baseline;
  margin-bottom: var(--cv-gap-entry);
  break-inside: avoid;
}
.cv-entry:last-child { margin-bottom: 0; }
.cv-entry-title { grid-area: title; font-weight: var(--cv-title-weight); color: var(--cv-title-color); }
.cv-entry-subtitle { grid-area: sub; color: var(--cv-muted); }
.cv--sub-italic .cv-entry-subtitle { font-style: italic; }
.cv-entry-date {
  grid-area: date;
  padding-left: 4mm;
  color: var(--cv-muted);
  font-size: 0.93em;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.cv-entry-content { grid-area: content; min-width: 0; }
.cv-entry-meta { margin-top: 0.9mm; color: var(--cv-muted); font-size: 0.93em; }
.cv-text { margin-top: 0.9mm; }
.cv-section-body > .cv-text:first-child { margin-top: 0; }
.cv-bullets { margin-top: 0.9mm; padding-left: 4.4mm; list-style: disc; }
.cv-bullets li { margin-bottom: 0.45mm; padding-left: 0.4mm; }
.cv-bullets li::marker { color: var(--cv-marker-color); }
.cv--bullet-dash .cv-bullets { list-style-type: "–  "; padding-left: 4.8mm; }
.cv--bullet-square .cv-bullets { list-style-type: square; }

.cv--entry-date-left .cv-entry {
  grid-template-columns: calc(1em * var(--cv-date-col)) minmax(0, 1fr);
  grid-template-areas: "date title" "date sub" "date content";
}
.cv--entry-date-left .cv-entry-date { padding: 0 4mm 0 0; text-align: left; white-space: normal; }

.cv--entry-date-below .cv-entry,
.cv--entry-timeline .cv-entry,
.cv-sidebar .cv-entry {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "sub" "date" "content";
}
.cv--entry-date-below .cv-entry-date,
.cv--entry-timeline .cv-entry-date,
.cv-sidebar .cv-entry-date { padding: 0; text-align: left; white-space: normal; }

/* Timeline: a rail down the left of each list of entries, a dot per entry, the date on top. */
.cv--entry-timeline .cv-main .cv-entry {
  position: relative;
  grid-template-areas: "date" "title" "sub" "content";
  margin-bottom: 0;
  padding: 0 0 var(--cv-gap-entry) 7mm;
}
.cv--entry-timeline .cv-main .cv-entry:last-child { padding-bottom: 0; }
.cv--entry-timeline .cv-main .cv-entry::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.42em;
  width: 2.3mm;
  height: 2.3mm;
  border: 0.5mm solid var(--cv-marker-color);
  border-radius: 50%;
  background: var(--cv-bg);
  z-index: 1;
}
.cv--entry-timeline .cv-main .cv-entry::after {
  content: "";
  position: absolute;
  left: 1.02mm;
  top: 0.42em;
  bottom: -0.42em;
  width: 0.25mm;
  background: var(--cv-rule);
}
.cv--entry-timeline .cv-main .cv-entry:last-child::after { bottom: 0; }
.cv--entry-timeline .cv-main .cv-entry-date { font-size: 0.86em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }

/* ---------- Skills and languages ---------- */
.cv-skills { display: flex; flex-direction: column; gap: 1.3mm; }
.cv-skill-group { break-inside: avoid; }
.cv-skill-category { font-weight: var(--cv-title-weight); color: var(--cv-title-color); }
.cv-skill-items { list-style: none; }

.cv--skills-rows .cv-skill-group { display: grid; grid-template-columns: 36mm minmax(0, 1fr); column-gap: 4mm; align-items: baseline; }
.cv--skills-rows .cv-skill-colon { display: none; }

.cv--skills-pills .cv-skills { gap: 1.9mm; }
.cv--skills-pills .cv-skill-group { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1.1mm 2.6mm; }
.cv--skills-pills .cv-skill-colon { display: none; }
.cv-pills { display: inline-flex; flex-wrap: wrap; gap: 1.1mm 1.3mm; min-width: 0; }
.cv-pill {
  max-width: 100%;
  padding: 0.1mm 1.9mm;
  border: 0.25mm solid color-mix(in srgb, var(--cv-marker-color) 55%, transparent);
  border-radius: 0.9mm;
  font-size: 0.92em;
}

.cv--skills-columns .cv-skills { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.6mm 6mm; }
.cv--skills-columns .cv-skill-category { display: block; margin-bottom: 0.5mm; }
.cv--skills-columns .cv-skill-colon { display: none; }

/* ---------- Two-column layouts ---------- */
.cv--layout-sidebar-left .cv-body, .cv--layout-sidebar-right .cv-body { display: grid; column-gap: 9mm; }
.cv--layout-sidebar-left .cv-body { grid-template-columns: var(--cv-sidebar-w) minmax(0, 1fr); }
.cv--layout-sidebar-right .cv-body { grid-template-columns: minmax(0, 1fr) var(--cv-sidebar-w); }
.cv--layout-sidebar-right .cv-sidebar { grid-column: 2; grid-row: 1; }
.cv--layout-sidebar-right .cv-main { grid-column: 1; grid-row: 1; }
.cv--divider.cv--layout-sidebar-left .cv-sidebar { padding-right: 8mm; border-right: 0.25mm solid var(--cv-rule); }
.cv--divider.cv--layout-sidebar-right .cv-sidebar { padding-left: 8mm; border-left: 0.25mm solid var(--cv-rule); }

/* Narrow columns stack everything. */
.cv-sidebar .cv-photo { width: 30mm; height: 30mm; margin-bottom: 6mm; }
.cv--photo-portrait .cv-sidebar .cv-photo { width: 27mm; height: 35mm; }
.cv-sidebar .cv-header { margin-bottom: var(--cv-gap-section); }
.cv-sidebar .cv-contact { margin-top: 0; font-size: 1em; }
.cv-sidebar .cv-contact-item { margin-bottom: 0.6mm; }
.cv-sidebar .cv-skills { display: flex; flex-direction: column; gap: 1.9mm; }
.cv-sidebar .cv-skill-group { display: block; }
.cv-sidebar .cv-skill-category { display: block; margin-bottom: 0.3mm; }
.cv-sidebar .cv-skill-colon { display: none; }
.cv-sidebar .cv-pills { display: flex; margin-top: 0.6mm; }
.cv-sidebar .cv-skills--languages .cv-skill-list { color: var(--cv-muted); }

.cv-lead { margin-bottom: var(--cv-gap-section); }
.cv-columns { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); column-gap: 10mm; }
.cv-col .cv-skill-group { display: block; }

/* Label layout: section titles in a left gutter, a hairline above each section. */
.cv--layout-label .cv-section {
  display: grid;
  grid-template-columns: 35mm minmax(0, 1fr);
  column-gap: 6mm;
  align-items: baseline;
}
.cv--layout-label .cv-heading { margin-bottom: 0; }
.cv--layout-label .cv-section-body { min-width: 0; }
/* The rule belongs to the first line of content, so a page break can never strand it at the foot of a sheet. */
.cv--layout-label .cv-section-body::before {
  content: "";
  display: block;
  margin: 0 0 3.6mm -41mm;
  border-top: var(--cv-rule-w) solid var(--cv-rule-color);
  break-after: avoid;
}

/* ---------- Colour: edge stripes, tinted pills ---------- */
.cv--edge-left { border-left: 4.5mm solid var(--cv-primary); }
.cv--edge-top { border-top: 3.2mm solid var(--cv-primary); }
.cv--accent-markers .cv-pill { border-color: color-mix(in srgb, var(--cv-primary) 28%, transparent); background: color-mix(in srgb, var(--cv-primary) 8%, transparent); }
.cv-sidebar .cv-pill { background: transparent; }

/* ---------- Fills: sidebars and banners ---------- */
.cv--bleed { padding: 0; }
.cv--fill-sidebar-tint .cv-body, .cv--fill-sidebar-dark .cv-body { column-gap: 0; min-height: 297mm; }
.cv--fill-sidebar-tint .cv-sidebar, .cv--fill-sidebar-dark .cv-sidebar {
  padding: var(--cv-pad-y) 8mm;
  background: var(--cv-fill-bg);
  color: var(--cv-fill-text);
  --cv-muted: var(--cv-fill-muted);
  --cv-rule: var(--cv-fill-rule);
  --cv-rule-color: var(--cv-fill-rule);
}
.cv--fill-sidebar-dark .cv-sidebar {
  --cv-name-color: var(--cv-fill-text);
  --cv-heading-color: var(--cv-fill-text);
  --cv-title-color: var(--cv-fill-text);
  --cv-marker-color: var(--cv-fill-muted);
}
.cv--fill-sidebar-tint .cv-main, .cv--fill-sidebar-dark .cv-main { padding: var(--cv-pad-y) 11mm; }
.cv--layout-sidebar-left.cv--bleed .cv-main { padding-right: var(--cv-pad-x); }
.cv--layout-sidebar-right.cv--bleed .cv-main { padding-left: var(--cv-pad-x); }

.cv--header-banner .cv-header {
  margin: 0;
  padding: 11mm var(--cv-pad-x) 10mm;
  background: var(--cv-fill-bg);
  color: var(--cv-fill-text);
  --cv-muted: var(--cv-fill-muted);
}
.cv--fill-banner-dark .cv-header { --cv-name-color: var(--cv-fill-text); }
.cv--header-banner .cv-body { padding: calc(var(--cv-pad-y) - 3mm) var(--cv-pad-x) var(--cv-pad-y); }

/* ---------- Khmer ---------- */
.cv:lang(km) { font-size: calc(var(--cv-font-size) * var(--cv-km-scale)); }
.cv:lang(km), .cv :lang(km) {
  line-height: var(--cv-leading-km);
  letter-spacing: 0 !important;
  font-style: normal !important;
  text-transform: none !important;
}
.cv .cv-name:lang(km) { font-size: calc(1em * min(var(--cv-name-size), 2.5)); line-height: 1.5; }
.cv .cv-headline:lang(km) { line-height: 1.6; }
/* Small capitals carry Latin headings; Khmer has no capitals, so it gets size instead. */
.cv .cv-heading:lang(km) { font-size: calc(1em * max(var(--cv-heading-size), 1.06)); line-height: 1.65; }
.cv--entry-timeline .cv-main .cv-entry-date:lang(km) { font-size: 0.93em; font-weight: 400; }
.cv .cv-monogram:lang(km) { font-size: 1.4em; line-height: 1; }
`;

const bleedPrint = (template: CVTemplate): string => {
  const scope = `.cv[data-template="${template.id}"]`;
  const { fill } = template.style;
  if (fill === "sidebar-tint" || fill === "sidebar-dark") {
    const side = template.layout.kind === "sidebar-right" ? "right" : "left";
    // The strip is fixed, so it repeats on every sheet and always reaches the bottom edge;
    // cloned padding gives each sheet's column its own top and bottom margin.
    return `
  ${scope} { min-height: 0; isolation: isolate; }
  ${scope} .cv-body { min-height: 296.5mm; }
  ${scope}::before { content: ""; position: fixed; top: 0; bottom: 0; ${side}: 0; width: var(--cv-sidebar-w); background: var(--cv-fill-bg); z-index: -1; }
  ${scope} .cv-sidebar { background: transparent; }
  ${scope} .cv-sidebar, ${scope} .cv-main { -webkit-box-decoration-break: clone; box-decoration-break: clone; }`;
  }
  // Banner: the band stays on the first sheet; cloned padding keeps margins on the following ones.
  return `
  ${scope} { min-height: 0; }
  ${scope} .cv-body { -webkit-box-decoration-break: clone; box-decoration-break: clone; }`;
};

/**
 * Print rules for one template: the @page size and margins, and what the CV
 * itself must change to fit them. Rendered by <CVPreview pageStyle> next to the
 * copy that is printed.
 *
 * Templates that are text on white print with real page margins (and no inner
 * padding), so every sheet has them. Templates with a filled sidebar or banner
 * print edge to edge and keep their own padding.
 */
export function getPageCss(template: CVTemplate): string {
  if (isFullBleed(template)) {
    return `@media print {\n  @page { size: A4; margin: 0; }${bleedPrint(template)}\n}`;
  }
  if (template.style.edge !== "none") {
    // An edge stripe has to reach the paper's edge: no page margin, and the page's own padding (and the
    // stripe) repeated on every sheet.
    return `@media print {\n  @page { size: A4; margin: 0; }\n  .cv[data-template="${template.id}"] { min-height: 0; -webkit-box-decoration-break: clone; box-decoration-break: clone; }\n}`;
  }
  const { padY, padX } = DENSITY[template.style.density];
  return `@media print {
  @page { size: A4; margin: ${padY}mm ${padX}mm; }
  .cv[data-template="${template.id}"] { width: auto; min-height: 0; padding: 0; }
}`;
}

/**
 * Print rules for the page that hosts the preview. Everything except the
 * element marked .cv-print-root is hidden, so "Print → Save as PDF" yields the CV only.
 */
export const printCss = /* css */ `
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  .cv-print-root { transform: none !important; zoom: 1 !important; margin: 0 !important; box-shadow: none !important; }
  .cv { box-shadow: none !important; }
  .cv-section { break-inside: auto; }
  .cv-header, .cv-entry, .cv-skill-group, .cv-contact { break-inside: avoid; }
  .cv-heading { break-after: avoid; }
  .cv-text, .cv-bullets li { orphans: 2; widows: 2; }
  .page-break { break-before: page; }
}
`;
