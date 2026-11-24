/**
 * Visual harness for the CV templates. Not a unit test: it renders every
 * template with realistic CVs and writes screenshots and PDFs to look at.
 *
 *   pnpm exec vitest run --config packages/template-engine/scripts/gallery.config.ts
 *
 * Output goes to packages/template-engine/scripts/out/ (git-ignored):
 *   html/<variant>/<id>.html      the standalone page for one template
 *   pages/<variant>/<id>.png      one screenshot per template
 *   sheets/<variant>-<n>.png      contact sheets, six templates each
 *   pdf/<id>-<variant>.pdf        printed through the browser, like "Save as PDF"
 *   pdf/<id>-<variant>.png        every sheet of that PDF side by side (needs pdftoppm)
 *
 * Environment:
 *   GALLERY_ONLY=minimal,modern   limit to some template ids
 *   GALLERY_VARIANTS=en,km        which CVs to render (en, km, mixed, stress, empty, accent, font)
 *   GALLERY_PDF=all|none|id,id    which templates to print (default: a varied set)
 *   GALLERY_PDF_LANG=en|km        print in this language (default: Khmer for Khmer-first templates, else English)
 *   GALLERY_PAGES=0               skip the per-template screenshots
 *   GALLERY_DOCX=1                also write docx/<variant>/<id>.docx and, with LibreOffice installed,
 *                                 sheets/docx-<variant>-<n>.png of their first pages
 *
 * Fonts are loaded from the @fontsource packages installed for apps/web, the
 * same files cv-fonts.ts bundles, so what you see is what the app renders.
 * Playwright must be resolvable with require("playwright").
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";
import { BUNDLED_FONTS, CVPreview, printCss, templateCss, templates, type CVTemplate } from "../src";
import { fullEnglishCV, fullKhmerCV, longCV, mixedCV, stressCV } from "../test/fixtures";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const out = join(here, "out");
const fontRoot = join(repo, "apps/web/node_modules");

const env = (name: string) => process.env[name]?.trim() || "";
const list = (name: string) =>
  env(name)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const fontLinks = Object.values(BUNDLED_FONTS)
  .flatMap((font) => font.files.map((file) => pathToFileURL(join(fontRoot, font.package, file)).href))
  .map((href) => `<link rel="stylesheet" href="${href}">`)
  .join("\n");

function page(body: string, extraCss = ""): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
${fontLinks}
<style>html, body { margin: 0; background: #e5e5e5; } ${templateCss} ${extraCss}</style>
</head><body>${body}</body></html>`;
}

const render = (cv: CVDocument, template: CVTemplate, pageStyle = false) =>
  renderToStaticMarkup(createElement(CVPreview, { cv, template, pageStyle }));

/** A neutral head-and-shoulders placeholder, drawn in the browser so no image file is needed. */
const AVATAR_HTML = `<!doctype html><html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
<rect width="240" height="300" fill="#c9ced6"/><circle cx="120" cy="112" r="52" fill="#8f97a3"/>
<path d="M20 300c0-66 44-108 100-108s100 42 100 108z" fill="#8f97a3"/></svg></body></html>`;

test("render the template gallery", async () => {
  const require = createRequire(import.meta.url);
  // Playwright is a tool on the machine, not a dependency of this package, so it is loaded untyped.
  const { chromium } = require("playwright");
  const browser = await chromium.launch();

  try {
    const avatarPage = await browser.newPage({ viewport: { width: 240, height: 300 } });
    await avatarPage.setContent(AVATAR_HTML);
    const photo = `data:image/png;base64,${(await avatarPage.screenshot()).toString("base64")}`;
    await avatarPage.close();

    const only = list("GALLERY_ONLY");
    const chosen = templates.filter((t) => only.length === 0 || only.includes(t.id));
    const variants: Record<string, () => CVDocument> = {
      en: () => fullEnglishCV({ photo }),
      km: () => fullKhmerCV({ photo }),
      mixed: () => mixedCV({ photo }),
      stress: () => stressCV(),
      empty: () => createEmptyCV(),
      // The person's own colour and font must reach every template.
      accent: () => {
        const cv = fullEnglishCV({ photo });
        cv.appearance.primaryColor = "#9a3412";
        return cv;
      },
      font: () => {
        const cv = fullKhmerCV({ photo });
        cv.appearance.fontFamily = "kantumruy";
        return cv;
      },
    };
    const wanted = list("GALLERY_VARIANTS");
    const variantNames = wanted.length > 0 ? wanted : ["en", "km"];

    rmSync(out, { recursive: true, force: true });
    for (const dir of ["html", "pages", "sheets", "pdf", "docx"]) mkdirSync(join(out, dir), { recursive: true });

    for (const variant of variantNames) {
      const make = variants[variant];
      if (!make) throw new Error(`Unknown variant "${variant}"`);
      mkdirSync(join(out, "html", variant), { recursive: true });
      mkdirSync(join(out, "pages", variant), { recursive: true });

      // One page per template.
      if (env("GALLERY_PAGES") !== "0") {
        const shot = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.25 });
        for (const template of chosen) {
          const file = join(out, "html", variant, `${template.id}.html`);
          writeFileSync(file, page(render(make(), template)));
          await shot.goto(pathToFileURL(file).href);
          await shot.evaluate(() => document.fonts.ready);
          await shot.locator(".cv").screenshot({ path: join(out, "pages", variant, `${template.id}.png`) });
        }
        await shot.close();
      }

      // Contact sheets: six to a sheet, each clipped to its first A4 page.
      const perSheet = 6;
      const sheetCss = `
        body { padding: 24px; background: #d4d4d4; font-family: system-ui, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(3, 508px); gap: 28px 24px; }
        .cell { width: 508px; }
        .label { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #111; }
        .label span { font-weight: 400; color: #555; }
        .frame { width: 508px; height: 718px; overflow: hidden; background: #fff; }
        .frame > .cv { zoom: 0.64; }`;
      const sheet = await browser.newPage({ viewport: { width: 1620, height: 1000 }, deviceScaleFactor: 1 });
      for (let i = 0; i < chosen.length; i += perSheet) {
        const cells = chosen
          .slice(i, i + perSheet)
          .map(
            (t) =>
              `<div class="cell"><div class="label">${templates.indexOf(t) + 1}. ${t.name} <span>${t.id} · ${t.category}</span></div><div class="frame">${render(make(), t)}</div></div>`,
          )
          .join("");
        const file = join(out, "html", variant, `sheet-${i / perSheet + 1}.html`);
        writeFileSync(file, page(`<div class="grid">${cells}</div>`, sheetCss));
        await sheet.goto(pathToFileURL(file).href);
        await sheet.evaluate(() => document.fonts.ready);
        await sheet.screenshot({ path: join(out, "sheets", `${variant}-${i / perSheet + 1}.png`), fullPage: true });
      }
      await sheet.close();
    }

    // Print: a long CV through the browser's own PDF engine, exactly as "Save as PDF" would.
    const pdfSetting = env("GALLERY_PDF");
    const defaultPdf = ["minimal", "modern", "margin", "balance", "timeline", "angkor", "kulen", "bokor", "creative", "tonle", "bayon"];
    const pdfIds = pdfSetting === "none" ? [] : pdfSetting === "all" ? templates.map((t) => t.id) : pdfSetting ? list("GALLERY_PDF") : defaultPdf;
    const printer = await browser.newPage();
    for (const id of pdfIds) {
      const template = templates.find((t) => t.id === id);
      if (!template || !chosen.includes(template)) continue;
      const forced = env("GALLERY_PDF_LANG");
      const khmerFirst = forced ? forced === "km" : template.traits.khmerFirst || template.traits.bilingual;
      const variant = khmerFirst ? "km" : "en";
      const cv = longCV(khmerFirst ? fullKhmerCV({ photo }) : fullEnglishCV({ photo }));
      const file = join(out, "html", `print-${id}.html`);
      writeFileSync(file, page(`<div class="cv-print-root">${render(cv, template, true)}</div>`, printCss));
      await printer.goto(pathToFileURL(file).href);
      await printer.evaluate(() => document.fonts.ready);
      const pdf = join(out, "pdf", `${id}-${variant}.pdf`);
      await printer.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
      try {
        // All sheets of the PDF side by side in one image, to check page breaks and margins at a glance.
        const stem = pdf.replace(/\.pdf$/, "");
        execFileSync("pdftoppm", ["-r", "72", "-png", pdf, `${stem}-page`]);
        const images = readdirSync(join(out, "pdf"))
          .filter((name) => name.startsWith(`${id}-${variant}-page`) && name.endsWith(".png"))
          .sort();
        const strip = images
          .map((name) => `<img src="${pathToFileURL(join(out, "pdf", name)).href}" style="width:520px;display:block;border:1px solid #999">`)
          .join("");
        await printer.setViewportSize({ width: Math.max(1, images.length) * 536 + 16, height: 760 });
        await printer.setContent(`<body style="margin:0;padding:16px;display:flex;gap:16px;background:#bbb">${strip}</body>`);
        await printer.waitForLoadState("load");
        await printer.screenshot({ path: `${stem}.png`, fullPage: true });
        for (const name of images) rmSync(join(out, "pdf", name));
      } catch {
        // pdftoppm is optional; the PDF itself is still written.
      }
    }
    await printer.close();

    // Word: write the .docx for every template and, when LibreOffice is available, contact sheets of their first pages.
    if (env("GALLERY_DOCX") === "1") {
      const { generateDOCXBuffer } = await import("../../export-engine/src/docx");
      const docxPage = await browser.newPage({ viewport: { width: 1620, height: 1000 } });
      for (const variant of variantNames) {
        const make = variants[variant]!;
        const dir = join(out, "docx", variant);
        mkdirSync(dir, { recursive: true });
        const files: string[] = [];
        for (const template of chosen) {
          const file = join(dir, `${template.id}.docx`);
          writeFileSync(file, await generateDOCXBuffer(make(), template));
          files.push(file);
        }
        try {
          execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, ...files], { stdio: "ignore" });
          for (const template of chosen) {
            execFileSync("pdftoppm", ["-r", "62", "-png", "-f", "1", "-l", "1", "-singlefile", join(dir, `${template.id}.pdf`), join(dir, template.id)]);
          }
          for (let i = 0; i < chosen.length; i += 6) {
            const cells = chosen
              .slice(i, i + 6)
              .map(
                (t) =>
                  `<div><div style="font:600 15px system-ui;margin-bottom:6px">${templates.indexOf(t) + 1}. ${t.name} (.docx)</div><img src="${pathToFileURL(join(dir, `${t.id}.png`)).href}" style="width:508px;display:block"></div>`,
              )
              .join("");
            // Written to a file and opened from there: a blank page may not load file:// images.
            const sheetFile = join(dir, `sheet-${i / 6 + 1}.html`);
            writeFileSync(
              sheetFile,
              `<!doctype html><body style="margin:0;padding:24px;background:#d4d4d4;display:grid;grid-template-columns:repeat(3,508px);gap:28px 24px">${cells}</body>`,
            );
            await docxPage.goto(pathToFileURL(sheetFile).href);
            await docxPage.screenshot({ path: join(out, "sheets", `docx-${variant}-${i / 6 + 1}.png`), fullPage: true });
          }
        } catch {
          // LibreOffice and pdftoppm are optional; the .docx files are still written.
        }
      }
      await docxPage.close();
    }
  } finally {
    await browser.close();
  }

  if (!existsSync(out)) throw new Error("no output written");
  console.log(`Gallery written to ${out}`);
});
