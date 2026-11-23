// End-to-end smoke test against the static build (run `pnpm build` first, then `pnpm e2e`).
// Covers the release acceptance criteria: create/save/reopen without AI, template switch, exports,
// Khmer rendering, offline use, no cloud requests unless enabled, minimal cloud payload, and clearing data.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("../out", import.meta.url));
const shots = fileURLToPath(new URL("./screenshots", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

const site = createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

const aiRequests = [];
const ai = createServer((req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST" };
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    aiRequests.push({ url: req.url, headers: req.headers, body: JSON.parse(raw) });
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, result: { text: "Led a team of 12 building web applications with React." } }));
  });
});

const listen = (server) => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));
const step = (name) => console.log(`✓ ${name}`);

const sitePort = await listen(site);
const aiPort = await listen(ai);
const origin = `http://localhost:${sitePort}`;
await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await context.newPage();
const external = [];
page.on("request", (r) => !r.url().startsWith(origin) && !r.url().startsWith("data:") && !r.url().startsWith("blob:") && external.push(r.url()));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const field = (label) => page.getByLabel(label, { exact: true });
const preview = page.getByTestId("preview");
const saved = () => page.waitForFunction(() => document.querySelector('[data-testid="save-state"]')?.textContent?.startsWith("Saved"));

try {
  // --- Create a CV with the guided questionnaire, no AI ---
  await page.goto(`${origin}/`);
  await page.getByText("Create your first CV").waitFor();
  await page.getByTestId("new-cv").click();
  await page.getByTestId("new-title").fill("Smoke test CV");
  await page.getByTestId("target-professional").click();
  await page.getByTestId("start-guide").click();
  await page.getByText("Who are you?").waitFor();
  await field("Full name").fill("Sok Dara");
  await field("Email").fill("dara@");
  await page.getByText("is not a valid email address").waitFor(); // inline rule feedback
  await field("Email").fill("dara@example.com");
  await field("Phone").fill("+855 12 345 678");
  await page.getByTestId("guide-next").click();

  await page.getByTestId("add-experiences").click();
  await field("Job title").fill("Frontend Developer");
  await field("Company or organization").fill("Acme Co");
  await field("Start date").fill("2022-01");
  await field("End date").fill("2024-06");
  await field("Description").fill("i build websites using React");
  await page.getByTestId("guide-next").click();

  await page.getByTestId("add-education").click();
  await field("School or university").fill("Royal University of Phnom Penh");
  await field("Degree or qualification").fill("BSc");
  await page.getByTestId("guide-next").click();

  // Rule-based quick add: no AI involved.
  await page.getByTestId("quick-add").click();
  await page.getByTestId("quick-text").fill("React, TypeScript, SQL");
  await page.getByTestId("quick-analyze").click();
  await page.getByText("This looks like:").waitFor();
  assert.match(await page.getByText("This looks like:").textContent(), /Skills/);
  await page.getByTestId("quick-confirm").click();
  await preview.getByText("TypeScript", { exact: true }).waitFor();
  step("guided questionnaire + rule-based quick add work without AI");

  for (let i = 0; i < 4; i++) await page.getByTestId("guide-next").click();
  await page.getByTestId("guide-finish").click();
  await page.waitForURL(/\/editor\//);
  await preview.getByText("Sok Dara").waitFor();
  await preview.getByText("Jan 2022 – Jun 2024").waitFor();
  await page.screenshot({ path: join(shots, "editor-en.png") });

  // --- Persistence across restart ---
  await page.reload();
  await preview.getByText("Frontend Developer").waitFor();
  step("CV survives a reload (autosaved to IndexedDB)");

  // --- Undo / redo ---
  await field("Full name").fill("Sok Dara Edited");
  await preview.getByText("Sok Dara Edited").waitFor();
  await page.getByLabel("Undo").click();
  await preview.getByText("Sok Dara", { exact: true }).waitFor();
  step("undo restores the previous value");

  // --- Template change keeps content ---
  const textBefore = await preview.locator(".cv-main").innerText();
  await page.getByTestId("tab-design").click();
  await page.getByTestId("template-corporate").click();
  await preview.locator('[data-template="corporate"]').waitFor();
  for (const expected of ["Frontend Developer", "Acme Co", "Royal University of Phnom Penh"]) assert.ok((await preview.innerText()).toLowerCase().includes(expected.toLowerCase()));
  assert.ok(textBefore.includes("Frontend Developer"));
  await page.getByTestId("template-modern").click();
  await preview.locator('[data-template="modern"]').waitFor();
  await page.screenshot({ path: join(shots, "design-modern.png") });
  step("changing template keeps content");

  // --- Check tab ---
  await page.getByTestId("tab-check").click();
  await page.getByText("Completeness").waitFor();
  await page.getByText("Add a short professional summary").waitFor();
  step("rule engine reports issues");

  // --- Exports ---
  await saved();
  await page.getByTestId("export").click();
  const [docx] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-docx").click()]);
  assert.equal(docx.suggestedFilename(), "Sok-Dara.docx");
  const docxBytes = await readFile(await docx.path());
  assert.equal(docxBytes.subarray(0, 2).toString(), "PK");
  await page.getByTestId("export").click();
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const backup = JSON.parse(await readFile(await json.path(), "utf8"));
  assert.equal(backup.format, "thaflow-cv");
  assert.equal(backup.cvs[0].personal.fullName, "Sok Dara");
  step("DOCX and JSON backup download");

  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".no-print").first().isVisible(), false);
  assert.equal(await page.locator(".print-only .cv").isVisible(), true);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: join(shots, "cv-en.pdf") });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  await page.emulateMedia({ media: null });
  step("print stylesheet shows only the CV; PDF renders");

  // --- AI off: nothing left the origin, and no AI buttons are offered ---
  await page.getByTestId("tab-content").click();
  await page.getByTestId("section-summary").click();
  assert.equal(await page.getByText("Improve wording").count(), 0);
  assert.deepEqual(external, []);
  step("with AI off there are no AI controls and zero cross-origin requests");

  // --- Cloud AI needs endpoint + consent ---
  const cvUrl = page.url();
  await page.goto(`${origin}/settings/`);
  await page.getByTestId("ai-cloud").check();
  await page.getByTestId("ai-endpoint").fill(`http://127.0.0.1:${aiPort}`);
  await page.getByTestId("ai-endpoint").blur();
  await page.getByText("AI is off.").waitFor(); // still unavailable without consent
  await page.getByTestId("ai-consent").check();
  await page.getByText("Cloud AI is ready.").waitFor();
  await page.waitForTimeout(500); // let the IndexedDB write commit before leaving the page
  await page.reload(); // the choice must have been persisted, not just held in memory
  await page.getByText("Cloud AI is ready.").waitFor();
  await page.goto(cvUrl);
  await page.getByTestId("section-experiences").click();
  assert.equal(aiRequests.length, 0);
  await page.getByRole("button", { name: /Improve wording/ }).click();
  await page.getByTestId("suggestion").waitFor();
  assert.equal(aiRequests.length, 1);
  assert.deepEqual(aiRequests[0].body, { task: "rewrite_text", language: "en", content: { text: "i build websites using React", kind: "experience", position: "Frontend Developer" } });
  assert.equal(aiRequests[0].headers.cookie, undefined);
  assert.equal(aiRequests[0].headers.referer, undefined);
  // The mock invents "team of 12": integrity warnings must be shown, and nothing applied yet.
  await page.getByText('Contains "12", which is not in your original text.').waitFor();
  assert.equal(await field("Description").inputValue(), "i build websites using React");
  await page.screenshot({ path: join(shots, "ai-suggestion.png") });
  await page.getByRole("button", { name: "Keep mine" }).click();
  assert.equal(await field("Description").inputValue(), "i build websites using React");
  await page.getByRole("button", { name: /Improve wording/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  assert.match(await field("Description").inputValue(), /Led a team of 12/);
  await page.getByRole("button", { name: "Restore my text" }).first().click();
  assert.equal(await field("Description").inputValue(), "i build websites using React");
  step("cloud AI: consent gate, minimal payload, integrity warning, accept/reject/restore");
  await saved();

  // --- Khmer CV ---
  await page.goto(`${origin}/new/`);
  await page.getByTestId("lang-km").click();
  await page.getByTestId("new-title").fill("Khmer CV");
  await page.getByText("Go straight to the editor").click();
  await page.waitForURL(/\/editor\//);
  await field("Full name").fill("សុខ ដារ៉ា");
  await field("Professional title").fill("អ្នកអភិវឌ្ឍន៍កម្មវិធី Frontend");
  await page.getByTestId("section-summary").click();
  await page.locator("textarea").first().fill("អ្នកអភិវឌ្ឍន៍កម្មវិធីដែលមានបទពិសោធន៍បីឆ្នាំក្នុងការបង្កើតគេហទំព័រ និងកម្មវិធីទូរស័ព្ទដោយប្រើ React និង TypeScript។ ស្រឡាញ់ការរៀនបច្ចេកវិទ្យាថ្មីៗ។");
  await page.getByTestId("section-experiences").click();
  await page.getByTestId("add-experiences").click();
  await field("Job title").fill("អ្នកអភិវឌ្ឍន៍គេហទំព័រ");
  await field("Company or organization").fill("ក្រុមហ៊ុន អេស៊ីអឹម");
  await field("Start date").fill("2022-01");
  await page.getByLabel("I currently work here").check();
  await preview.getByText("មករា 2022 – បច្ចុប្បន្ន").waitFor();
  await preview.getByText("បទពិសោធន៍ការងារ").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const khmerFont = await preview.locator(".cv-name").evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
  assert.ok(khmerFont.some((f) => /Khmer|Kantumruy|Battambang/.test(f)), `no Khmer webfont loaded: ${khmerFont}`);
  await saved();
  await page.screenshot({ path: join(shots, "editor-km.png") });
  step("Khmer CV renders with Khmer labels, dates and an embedded Khmer font");

  // --- Khmer UI ---
  await page.goto(`${origin}/`);
  await page.getByRole("button", { name: "ខ្មែរ" }).click();
  await page.getByRole("heading", { name: "ប្រវត្តិរូបរបស់ខ្ញុំ" }).waitFor();
  await page.screenshot({ path: join(shots, "home-km.png") });
  await page.getByRole("button", { name: "EN" }).click();
  await page.getByRole("heading", { name: "My CVs" }).waitFor();
  step("interface switches between English and Khmer");

  // --- Backup import ---
  await page.getByTestId("import-input").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByText("Imported 1 CV(s).").waitFor();
  assert.equal(await page.getByRole("heading", { name: "Smoke test CV" }).count(), 2);
  await page.getByTestId("import-input").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await page.getByText("not a valid ThaFlow CV backup").waitFor();
  step("JSON backup restores; invalid files are rejected");

  // --- Offline ---
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the worker control the page and cache what it loads
  await page.getByRole("heading", { name: "My CVs" }).waitFor();
  await page.goto(cvUrl);
  await preview.getByText("Sok Dara").waitFor();
  await context.setOffline(true);
  await page.goto(`${origin}/`);
  await page.getByRole("heading", { name: "Khmer CV" }).waitFor();
  await page.goto(cvUrl);
  await preview.getByText("Sok Dara").waitFor();
  await field("Location").fill("Phnom Penh");
  await preview.getByText("Phnom Penh").first().waitFor();
  await context.setOffline(false);
  step("app shell and editing work offline");

  // --- Clear all data ---
  await page.goto(`${origin}/settings/`);
  await page.getByTestId("clear-data").click();
  await page.getByTestId("confirm-clear").click();
  await page.getByText("All local data was deleted.").waitFor();
  await page.goto(`${origin}/`);
  await page.getByText("Create your first CV").waitFor();
  step("user can delete all local data");

  // --- Mobile layout ---
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mobile = await phone.newPage();
  await mobile.goto(`${origin}/new/`);
  await mobile.getByTestId("start-guide").click();
  await mobile.getByLabel("Full name", { exact: true }).fill("Mobile User");
  await mobile.getByRole("tab", { name: "Preview" }).click();
  await mobile.getByTestId("preview").getByText("Mobile User").waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "page scrolls horizontally on mobile");
  await mobile.screenshot({ path: join(shots, "mobile-preview.png") });
  step("mobile layout has edit/preview tabs and no horizontal overflow");

  const unexpected = external.filter((u) => !u.startsWith(`http://127.0.0.1:${aiPort}`));
  assert.deepEqual(unexpected, [], "unexpected cross-origin requests");
  const realErrors = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
  assert.deepEqual(realErrors, [], "console errors");
  console.log("\nAll smoke checks passed.");
} catch (error) {
  await page.screenshot({ path: join(shots, "failure.png") }).catch(() => {});
  console.error("\nSmoke test failed:", error);
  if (errors.length) console.error("Console errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  site.close();
  ai.close();
}
