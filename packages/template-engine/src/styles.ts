import type { CVTemplate } from "./templates";

/**
 * Stylesheet shared by every template. Templates differ only through modifier
 * classes and CSS variables set by <CVPreview>, so adding a template is mostly
 * configuration. Inject once with <style>{templateCss}</style>.
 */
export const templateCss = /* css */ `
.cv {
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  padding: 14mm 15mm;
  background: var(--cv-bg);
  color: var(--cv-text);
  font-family: var(--cv-font-body);
  font-size: var(--cv-font-size);
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.cv *, .cv *::before, .cv *::after { box-sizing: border-box; }
/* Khmer stacks subscripts and vowels above/below the baseline and needs more leading. */
.cv:lang(km) { line-height: 1.75; }
.cv h1, .cv h2, .cv p, .cv ul { margin: 0; padding: 0; }

.cv-header { display: flex; gap: 5mm; align-items: center; margin-bottom: 6mm; }
.cv-header-text { flex: 1; min-width: 0; }
.cv-name { font-family: var(--cv-font-heading); font-size: 2.3em; line-height: 1.2; font-weight: 700; color: var(--cv-primary); }
.cv:lang(km) .cv-name { line-height: 1.5; }
.cv-headline { font-size: 1.15em; color: var(--cv-muted); margin-top: 1mm; }
.cv-contact { display: flex; flex-wrap: wrap; gap: 0.5mm 4mm; margin-top: 2.5mm; color: var(--cv-muted); font-size: 0.95em; }
.cv-contact--stacked { flex-direction: column; margin-top: 0; }
.cv-photo { width: 28mm; height: 28mm; border-radius: 50%; object-fit: cover; flex: none; }
.cv--align-center .cv-header { flex-direction: column; text-align: center; }
.cv--align-center .cv-contact { justify-content: center; }

.cv-section { margin-bottom: 5mm; }
.cv-heading {
  font-family: var(--cv-font-heading);
  font-size: 1.08em;
  font-weight: 700;
  color: var(--cv-primary);
  margin-bottom: 2.2mm;
  break-after: avoid;
}
.cv--heading-caps .cv-heading { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.95em; }
.cv--heading-underline .cv-heading { border-bottom: 0.35mm solid var(--cv-primary); padding-bottom: 0.8mm; text-transform: uppercase; letter-spacing: 0.04em; }
.cv--heading-bar .cv-heading { border-left: 1.2mm solid var(--cv-primary); padding-left: 2.2mm; }
.cv--heading-boxed .cv-heading { background: color-mix(in srgb, var(--cv-primary) 10%, transparent); padding: 0.8mm 2mm; border-radius: 0.8mm; }
.cv--heading-plain .cv-heading { font-size: 1.15em; }
/* Letter-spacing breaks Khmer clusters apart; never apply it to Khmer text. */
.cv:lang(km) .cv-heading { letter-spacing: 0; }

.cv-entry { display: flex; margin-bottom: 3mm; break-inside: avoid; }
.cv-entry:last-child { margin-bottom: 0; }
.cv-entry-body { flex: 1; min-width: 0; }
.cv-entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.cv-entry-title { font-weight: 700; }
.cv-entry-date-inline { color: var(--cv-muted); font-size: 0.92em; white-space: nowrap; flex: none; }
.cv-entry-subtitle { color: var(--cv-muted); font-style: italic; }
.cv:lang(km) .cv-entry-subtitle { font-style: normal; }
.cv-entry-meta { color: var(--cv-muted); font-size: 0.92em; margin-top: 0.8mm; }
.cv-text { margin-top: 0.8mm !important; white-space: pre-wrap; }
.cv-section > .cv-text:first-of-type { margin-top: 0 !important; }
.cv-bullets { margin-top: 0.8mm !important; padding-left: 4.5mm !important; }
.cv-bullets li { margin-bottom: 0.4mm; }

.cv-entry-date { width: 32mm; flex: none; color: var(--cv-muted); font-size: 0.92em; padding-top: 0.2mm; }

.cv-skills { display: flex; flex-direction: column; gap: 1.2mm; }
.cv-skill-category { font-weight: 700; margin-right: 2mm; }
.cv-skill-category::after { content: ":"; }
.cv-pills { display: inline-flex; flex-wrap: wrap; gap: 1mm 1.2mm; vertical-align: middle; }
.cv-pill { border: 0.25mm solid color-mix(in srgb, var(--cv-primary) 45%, transparent); border-radius: 1mm; padding: 0 1.6mm; font-size: 0.92em; }

/* Two-column layouts */
.cv--sidebar-left, .cv--sidebar-right { display: grid; padding: 0; }
.cv--sidebar-left { grid-template-columns: 66mm 1fr; }
.cv--sidebar-right { grid-template-columns: 1fr 66mm; }
.cv--sidebar-right .cv-sidebar { order: 2; }
.cv-sidebar { background: var(--cv-sidebar-bg); color: var(--cv-sidebar-text); padding: 14mm 7mm; min-width: 0; }
.cv--sidebar-left .cv-main, .cv--sidebar-right .cv-main { padding: 14mm 11mm; min-width: 0; }
.cv-sidebar .cv-heading { color: var(--cv-sidebar-text); border-color: currentColor; }
.cv-sidebar .cv-contact, .cv-sidebar .cv-entry-subtitle, .cv-sidebar .cv-entry-date-inline, .cv-sidebar .cv-skill-list { color: inherit; opacity: 0.85; }
.cv-sidebar .cv-photo { display: block; margin: 0 auto 6mm; width: 34mm; height: 34mm; }
.cv-sidebar .cv-skill-group { display: flex; flex-direction: column; gap: 0.6mm; }
.cv-sidebar .cv-skill-category::after { content: ""; }
.cv-sidebar .cv-pill { border-color: currentColor; }
.cv-sidebar .cv-entry-head { flex-direction: column; gap: 0; }

/* Banner layout: full-width colored header */
.cv--banner { padding: 0; }
.cv--banner .cv-header { background: var(--cv-primary); color: #fff; padding: 12mm 15mm; margin: 0; }
.cv--banner .cv-name { color: #fff; }
.cv--banner .cv-headline, .cv--banner .cv-contact { color: rgba(255, 255, 255, 0.88); }
.cv--banner .cv-main { padding: 9mm 15mm 14mm; }
`;

/** The @page rule for one template. Rendered by <CVPreview pageStyle>. */
export function getPageCss(_template: CVTemplate): string {
  return "@media print { @page { size: A4; margin: 0; } }";
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
  /* Just under one A4 page so full-height sidebars reach the bottom without spilling onto a blank page. */
  .cv { min-height: 296.5mm; box-shadow: none !important; }
  .cv-section { break-inside: auto; }
  .cv-entry, .cv-skill-group { break-inside: avoid; }
  .page-break { break-before: page; }
}
`;
