// End-to-end smoke test against the static build (run `pnpm build` first, then `pnpm e2e`).
// Walks the product the way a person does: landing → questions → choose a template → finished CV,
// then checks the promises the product makes: works without AI, survives a reload, exports,
// reads an existing CV on the device, Khmer, offline, no network unless cloud AI is enabled, and deletion.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("../out", import.meta.url));
const shots = fileURLToPath(new URL("./screenshots", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".wasm": "application/wasm" };

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
    res.end(JSON.stringify({ success: true, result: { text: "Led a team of 12 preparing monthly financial reports." } }));
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

const id = (testId) => page.getByTestId(testId);
const next = () => id("create-next").click();
const preview = id("preview");
const saved = () => page.waitForFunction(() => document.querySelector('[data-testid="save-state"]')?.textContent?.trim() === "Saved");
const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });

/** Answer the questions as a new person and stop at the template chooser. */
async function answerQuestions({ khmer = false } = {}) {
  await id(khmer ? "create-language-km" : "create-language-en").click();
  await id("create-name").fill(khmer ? "សុខ ដារ៉ា" : "Sok Dara");
  await next();
  await id("create-title").fill(khmer ? "គណនេយ្យករ" : "Accountant");
  await next();
  await id("create-email").fill("dara@example.com");
  await id("create-phone").fill("+855 12 345 678");
  await id("create-location").fill(khmer ? "ភ្នំពេញ កម្ពុជា" : "Phnom Penh, Cambodia");
  await next();
  await id("create-worked-yes").click();
  await id("create-work-position").fill(khmer ? "គណនេយ្យករ" : "Accountant");
  await id("create-work-company").fill(khmer ? "ក្រុមហ៊ុន អេស៊ីអឹម" : "Acme Trading");
  await id("create-work-start-month").selectOption("01");
  await id("create-work-start-year").selectOption("2022");
  if (khmer) await id("create-work-current").check();
  else {
    await id("create-work-end-month").selectOption("06");
    await id("create-work-end-year").selectOption("2024");
  }
  await id("create-work-description").fill(khmer ? "រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុប្រចាំខែ។" : "i prepare monthly financial reports");
  await next();
  await id("create-entry-list").waitFor();
  await next();
  await id("create-education-institution").fill(khmer ? "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ" : "Royal University of Phnom Penh");
  await id("create-education-degree").selectOption({ label: khmer ? "បរិញ្ញាបត្រ" : "Bachelor's degree" }); // a dropdown of common degrees
  await id("create-education-field").fill(khmer ? "គណនេយ្យ" : "Accounting");
  await id("create-education-end-year").selectOption("2021");
  await next();
  await id("create-entry-list").waitFor();
  await next();
  await page.locator('[data-testid="create-skills"] input, input[data-testid="create-skills"]').first().fill("Excel, QuickBooks, Tax filing,");
  await next();
  await id("create-language-name").first().fill(khmer ? "ខ្មែរ" : "Khmer");
  await next();
  if (khmer) await id("create-about").fill("គណនេយ្យករដែលមានបទពិសោធន៍បីឆ្នាំ។");
  else {
    // "Write it for me": a first draft assembled on the device from the answers already given.
    await id("create-about-write").click();
    assert.equal(await id("create-about").inputValue(), "Accountant with 2 years of experience at Acme Trading. Holds a Bachelor's degree in Accounting from Royal University of Phnom Penh. Skilled in Excel, QuickBooks and Tax filing. Speaks Khmer.");
  }
  await next();
  await page.waitForURL(/\/templates\//);
  await id("template-grid").waitFor();
}

try {
  // --- Landing: says what it does, one way forward ---
  await page.goto(`${origin}/`);
  await page.getByRole("heading", { name: "Your CV, ready in minutes." }).waitFor();
  assert.equal(await id("landing-cv").count(), 0);
  await shot("landing");
  await id("landing-create").click();

  // --- Questions: new person, no AI ---
  await page.getByRole("heading", { name: "Do you already have a CV?" }).waitFor();
  await shot("question-start");
  await id("create-start-no").click();
  await id("create-language-en").click();
  await id("create-name").waitFor();
  assert.equal(await id("create-next").isDisabled(), true, "name is required");
  await page.goBack(); // every question is a URL
  await id("create-language-en").waitFor();
  await answerQuestions();
  step("a new person can answer the questions and reach the templates, with no AI");

  // --- Reload mid-flow keeps answers (every question is a URL, the CV is already saved) ---
  await page.goBack();
  await id("create-about").waitFor();
  await page.reload();
  assert.match(await id("create-about").inputValue(), /2 years of experience at Acme Trading/);
  await next();
  await id("template-grid").waitFor();
  step("answers survive Back and a reload");

  // --- Choose a template ---
  assert.equal(await id("template-grid").locator('[data-testid^="template-"]').count(), 30);
  await id("filter-classic").click();
  const classic = await id("template-grid").locator('[data-testid^="template-"]').count();
  assert.ok(classic >= 5 && classic < 30, `classic filter shows ${classic}`);
  await id("filter-all").click();
  await id("template-timeline").click();
  assert.equal((await id("selected-template").textContent()).trim(), "Timeline");
  await shot("templates");
  await id("use-template").click();
  await page.waitForURL(/\/editor\//);
  await preview.locator('[data-template="timeline"]').waitFor();
  await preview.getByText("Sok Dara").first().waitFor();
  await preview.getByText(/Jan 2022 – Jun 2024/i).first().waitFor();
  await shot("editor");
  step("30 templates, filter, choose one, land on the finished CV");
  const cvUrl = page.url();

  // --- Persistence, undo, editing, template change keeps content ---
  await page.reload();
  await preview.getByText("Acme Trading").first().waitFor();
  await page.getByLabel("Full name", { exact: true }).fill("Sok Dara Edited");
  await preview.getByText("Sok Dara Edited").first().waitFor();
  await id("undo").click();
  await preview.getByText("Sok Dara", { exact: true }).first().waitFor();
  // Change template without leaving the editor, then through the full chooser.
  await id("open-templates").click();
  await id("template-modern").click();
  await preview.locator('[data-template="modern"]').waitFor();
  assert.match(page.url(), /\/editor\//);
  await id("change-template").click();
  await id("template-ats").click();
  await id("use-template").click();
  await preview.locator('[data-template="ats"]').waitFor();
  for (const expected of ["Accountant", "Acme Trading", "Royal University of Phnom Penh", "QuickBooks", "Bachelor's degree"]) {
    assert.ok((await preview.innerText()).includes(expected), `missing after template change: ${expected}`);
  }
  await id("tab-check").click();
  await page.getByText("Completeness").waitFor();
  await id("tab-design").click();
  await id("tab-content").click();
  // A summary already written is never replaced silently: the draft is offered beside it.
  await id("section-summary").click();
  await id("summary-box").fill("i do accounting");
  await id("write-summary").click();
  await id("suggestion").waitFor();
  await page.getByRole("button", { name: "Keep mine" }).click();
  assert.equal(await id("summary-box").inputValue(), "i do accounting");
  step("CV survives reload; undo works; changing template keeps content; review and style tools open");

  // --- Downloads ---
  await saved();
  await id("export").click();
  const [docx] = await Promise.all([page.waitForEvent("download"), id("export-docx").click()]);
  assert.equal(docx.suggestedFilename(), "Sok-Dara.docx");
  const docxPath = join(shots, "Sok-Dara.docx");
  await docx.saveAs(docxPath);
  assert.equal((await readFile(docxPath)).subarray(0, 2).toString(), "PK");
  await id("export").click();
  const [json] = await Promise.all([page.waitForEvent("download"), id("export-json").click()]);
  const backup = JSON.parse(await readFile(await json.path(), "utf8"));
  assert.equal(backup.format, "thaflow-cv");
  assert.equal(backup.cvs[0].personal.fullName, "Sok Dara");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".no-print").first().isVisible(), false);
  assert.equal(await page.locator(".print-only .cv").isVisible(), true);
  const pdfPath = join(shots, "Sok-Dara.pdf");
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: pdfPath });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  await page.emulateMedia({ media: null });
  step("Word and backup download; print shows only the CV and makes a PDF");

  // --- AI off: no AI controls, nothing left the origin ---
  await id("section-experiences").click();
  assert.equal(await page.getByText("Improve wording").count(), 0);
  assert.deepEqual(external, []);
  step("with AI off there are no AI controls and zero cross-origin requests");

  // --- Existing CV: read a Word file and a PDF on the device ---
  for (const [kind, file] of [["Word", docxPath], ["PDF", pdfPath]]) {
    await page.goto(`${origin}/create/`);
    await id("create-start-yes").click();
    await id("create-source-private").waitFor(); // the one line that says the file stays on the device
    await id("create-file-input").setInputFiles(file);
    await id("create-found").waitFor({ timeout: 30000 });
    assert.match(await id("create-found-name").textContent(), /Sok Dara/, `${kind}: name not recognised`);
    await next();
    await id(`create-language-en`).click();
    assert.equal(await id("create-name").inputValue(), "Sok Dara", `${kind}: name not pre-filled`);
    await next();
    await next();
    assert.equal(await id("create-email").inputValue(), "dara@example.com", `${kind}: email not pre-filled`);
    await next();
    await id("create-entry-list").waitFor(); // imported jobs go straight to the list
    assert.match(await id("create-entry-list").innerText(), /Acme Trading/, `${kind}: job not recognised`);
  }
  // A CV from another tool, in two columns with a letter-spaced job title: columns must not be read across.
  await page.goto(`${origin}/create/`);
  await id("create-start-yes").click();
  await id("create-file-input").setInputFiles(fileURLToPath(new URL("../../../packages/import-engine/test/fixtures/foreign/sidebar-left.pdf", import.meta.url)));
  await id("create-found").waitFor({ timeout: 30000 });
  assert.match(await id("create-found-name").textContent(), /Dara Sok/, "two columns: name not recognised");
  assert.match(await id("create-found-counts").textContent(), /2 jobs · 1 school · 2 projects · 21 skills · 2 languages/, "two columns: sections mixed up");
  await next();
  await id(`create-language-en`).click();
  await next();
  assert.equal(await id("create-title").inputValue(), "DATA SCIENCE & ENGINEERING", "two columns: job title not recognised");
  await next();
  assert.equal(await id("create-location").inputValue(), "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh", "two columns: address not recognised");
  await next();
  assert.match(await id("create-entry-list").innerText(), /Teaching Assistant[\s\S]*Student Ambassador/, "two columns: jobs not recognised");

  // The same Word file dropped onto the page instead of picked. Anywhere on the page counts, not only the box.
  await page.goto(`${origin}/create/`);
  await id("create-start-yes").click();
  await id("create-source-file").waitFor();
  const held = await page.evaluateHandle(
    ({ bytes, name, type }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], name, { type }));
      return transfer;
    },
    { bytes: [...(await readFile(docxPath))], name: "Sok-Dara.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  );
  const drag = (type, target = "main") => page.dispatchEvent(target, type, { dataTransfer: held });
  await drag("dragenter");
  assert.match(await id("create-source-file").textContent(), /Drop your file here/, "drop: the file choice does not say it takes the file");
  await drag("dragleave");
  assert.match(await id("create-source-file").textContent(), /Choose a file/, "drop: still lit after the file left the page");
  await drag("dragenter");
  assert.equal(await page.evaluate((transfer) => !document.querySelector("h1").dispatchEvent(new DragEvent("dragover", { dataTransfer: transfer, bubbles: true, cancelable: true })), held), true, "drop: the page does not accept a file");
  await drag("drop", "h1");
  await id("create-found").waitFor({ timeout: 30000 });
  assert.match(await id("create-found-name").textContent(), /Sok Dara/, "drop: name not recognised");
  // Once a file has been read, another one let go of on the page is neither read nor opened by the browser.
  assert.equal(await page.evaluate((transfer) => !document.querySelector("h1").dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true })), held), true, "drop: a second file would replace the app");
  assert.match(await id("create-found-name").textContent(), /Sok Dara/);

  await page.goto(`${origin}/create/`);
  await id("create-start-yes").click();
  await id("create-file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await id("create-import-error").waitFor();
  await id("create-source-type").click(); // has a CV but would rather type: same questions as a new person
  await id("create-language-en").waitFor();
  assert.deepEqual(external, [], "importing a file must not touch the network");
  step("an existing CV (Word, PDF, and a two-column PDF from another tool) is read on the device, picked or dropped; other files are refused");

  // --- Cloud AI needs an address and explicit consent ---
  await page.goto(`${origin}/settings/`);
  await id("ai-cloud").check();
  await id("ai-endpoint").fill(`http://127.0.0.1:${aiPort}`);
  await id("ai-endpoint").blur();
  await page.getByText("AI is off.").waitFor();
  await id("ai-consent").check();
  await page.getByText("Cloud AI is ready.").waitFor();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByText("Cloud AI is ready.").waitFor();
  await page.goto(cvUrl);
  await id("view-edit").click({ timeout: 2000 }).catch(() => {});
  await id("section-experiences").click();
  assert.equal(aiRequests.length, 0);
  await page.getByRole("button", { name: /Improve wording/ }).click();
  await id("suggestion").waitFor();
  assert.equal(aiRequests.length, 1);
  assert.deepEqual(aiRequests[0].body, { task: "rewrite_text", language: "en", content: { text: "i prepare monthly financial reports", kind: "experience", position: "Accountant" } });
  assert.equal(aiRequests[0].headers.cookie, undefined);
  assert.equal(aiRequests[0].headers.referer, undefined);
  await page.getByText('Contains "12", which is not in your original text.').waitFor();
  const description = page.getByLabel("Description", { exact: true });
  assert.equal(await description.inputValue(), "i prepare monthly financial reports");
  await shot("ai-suggestion");
  await page.getByRole("button", { name: "Keep mine" }).click();
  assert.equal(await description.inputValue(), "i prepare monthly financial reports");
  await page.getByRole("button", { name: /Improve wording/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  assert.match(await description.inputValue(), /Led a team of 12/);
  await page.getByRole("button", { name: "Restore my text" }).first().click();
  assert.equal(await description.inputValue(), "i prepare monthly financial reports");
  await id("ai-longer").first().click();
  await id("suggestion").waitFor();
  assert.equal(aiRequests[2].body.content.length, "longer");
  await page.getByRole("button", { name: "Keep mine" }).click();
  await saved();
  step("cloud AI: consent gate, one field sent, integrity warning, accept / keep mine / restore");

  // --- Khmer CV through the questions ---
  await page.goto(`${origin}/create/`);
  await id("create-start-no").click();
  await answerQuestions({ khmer: true });
  await id("use-template").click();
  await page.waitForURL(/\/editor\//);
  await preview.getByText("សុខ ដារ៉ា").first().waitFor();
  await preview.getByText(/មករា 2022 – បច្ចុប្បន្ន/).first().waitFor();
  await preview.getByText("បទពិសោធន៍ការងារ").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
  assert.ok(loaded.some((f) => /Khmer|Kantumruy|Battambang|Hanuman|Moul/.test(f)), `no Khmer webfont loaded: ${loaded}`);
  await saved();
  await shot("editor-km");
  // Kept for later: a Khmer PDF has no usable text layer, so importing it means reading the page itself.
  await page.emulateMedia({ media: "print" });
  const khmerPdfPath = join(shots, "cv-km.pdf");
  await page.pdf({ preferCSSPageSize: true, printBackground: true, path: khmerPdfPath });
  await page.emulateMedia({ media: null });
  step("a Khmer CV renders with Khmer labels, dates and a bundled Khmer font");

  // --- Landing with saved CVs; Khmer interface ---
  await page.goto(`${origin}/`);
  await id("landing-cv").first().waitFor();
  assert.ok((await id("landing-cv").count()) >= 4);
  await page.getByRole("button", { name: "ខ្មែរ" }).click();
  await page.getByRole("heading", { name: "ប្រវត្តិរូបរបស់អ្នក រួចរាល់ក្នុងប៉ុន្មាននាទី។" }).waitFor();
  await shot("landing-km");
  await page.getByRole("button", { name: "EN" }).click();
  await page.getByRole("heading", { name: "Your CV, ready in minutes." }).waitFor();
  step("saved CVs are listed; the interface switches between English and Khmer");

  // --- Backup restore and delete one ---
  const before = await id("landing-cv").count();
  await id("landing-restore-input").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByText("Restored 1 CV(s).").waitFor();
  assert.equal(await id("landing-cv").count(), before + 1);
  await id("landing-restore-input").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await page.getByText("not a ThaFlow CV backup").waitFor();
  await id("landing-cv-delete").first().click();
  await id("landing-cv-delete-confirm").click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="landing-cv"]').length === n, before);
  step("a backup restores; invalid files are rejected; a CV can be deleted");

  // --- Offline ---
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.getByRole("heading", { name: "Your CV, ready in minutes." }).waitFor();
  await page.goto(cvUrl);
  await preview.getByText("Sok Dara").first().waitFor();
  await page.goto(`${origin}/create/`);
  await id("create-start-no").waitFor();
  await page.goto(`${origin}/templates/?id=x`);
  await id("gallery-not-found").waitFor();
  await context.setOffline(true);
  await page.goto(`${origin}/`);
  await id("landing-cv").first().waitFor();
  await page.goto(cvUrl);
  await preview.getByText("Sok Dara").first().waitFor();
  await page.getByLabel("Location", { exact: true }).first().fill("Siem Reap");
  await preview.getByText("Siem Reap").first().waitFor();
  await page.goto(`${origin}/create/`);
  await id("create-start-no").waitFor();
  await context.setOffline(false);
  step("landing, questions and editing work offline");

  // --- Pictures, scans and Khmer PDFs: read on the device by ThaOCR's models ---
  // The models are not part of this repository. Point THAFLOW_OCR_MODELS at a folder holding them
  // (textdet/db_v2.onnx, rec/crnn_m_v3_owner.onnx, rec/crnn_m_v3_owner.vocab.json) to run this part.
  const modelBase = "https://huggingface.co/Thareah/ThaOCR-models/resolve/main/";
  if (process.env.THAFLOW_OCR_MODELS) {
    const fetched = [];
    await context.route(`${modelBase}**`, async (route) => {
      const file = route.request().url().slice(modelBase.length);
      fetched.push(file);
      await route.fulfill({ status: 200, contentType: "application/octet-stream", headers: { "Access-Control-Allow-Origin": "*" }, body: await readFile(join(process.env.THAFLOW_OCR_MODELS, file)) });
    });
    const picture = (name) => fileURLToPath(new URL(`../../../packages/import-engine/test/fixtures/pictures/${name}`, import.meta.url));
    const importPicture = async (file) => {
      await page.goto(`${origin}/create/`);
      await id("create-start-yes").click();
      await id("create-file-input").setInputFiles(file);
      await id("create-reading").waitFor();
      await id("create-found").waitFor({ timeout: 300000 });
      assert.match(await id("create-found-warning").textContent(), /read from a picture/);
    };
    for (const [kind, file] of [["phone photo", picture("phone-photo.jpg")], ["scanned PDF", picture("scan.pdf")]]) {
      await importPicture(file);
      assert.match(await id("create-found-name").textContent(), /Dara Sok/, `${kind}: name not read`);
      assert.match(await id("create-found-counts").textContent(), /2 jobs · 1 school · 2 projects · \d+ skills · 2 languages/, `${kind}: sections not read`);
      await next();
      await id(`create-language-en`).click();
      await next();
      assert.equal(await id("create-title").inputValue(), "DATA SCIENCE & ENGINEERING", `${kind}: job title not read`);
      await next();
      assert.equal(await id("create-email").inputValue(), "dara.sok@example.com", `${kind}: email not read`);
      assert.equal(await id("create-phone").inputValue(), "+855 12 345 678", `${kind}: phone not read`);
      assert.equal(await id("create-location").inputValue(), "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh", `${kind}: address not read`);
      await next();
      assert.match(await id("create-entry-list").innerText(), /Teaching Assistant[\s\S]*Student Ambassador/, `${kind}: jobs not read`);
    }
    await importPicture(khmerPdfPath);
    assert.match(await id("create-found-name").textContent(), /សុខ/, "Khmer PDF: name not read");
    assert.match(await id("create-found-counts").textContent(), /1 job/, "Khmer PDF: job not read");
    // Only the models were fetched, each once: the second and third files were read with the cached copies.
    assert.deepEqual(fetched.slice().sort(), ["rec/crnn_m_v3_owner.onnx", "rec/crnn_m_v3_owner.vocab.json", "textdet/db_v2.onnx"]);
    step("a phone photo, a scanned PDF and a Khmer PDF are read on the device; only the reading models are fetched, once");
  } else {
    console.log("- skipped: reading pictures and scans (set THAFLOW_OCR_MODELS to a folder with ThaOCR's models)");
  }

  // --- Clear all data ---
  await page.goto(`${origin}/settings/`);
  await id("clear-data").click();
  await id("confirm-clear").click();
  await page.getByText("All local data was deleted.").waitFor();
  await page.goto(`${origin}/`);
  await page.getByRole("heading", { name: "Your CV, ready in minutes." }).waitFor();
  assert.equal(await id("landing-cv").count(), 0);
  step("all local data can be deleted");

  // --- Phone ---
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mobile = await phone.newPage();
  const noOverflow = async (where) => assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `horizontal scroll on phone: ${where}`);
  await mobile.goto(`${origin}/`);
  await noOverflow("landing");
  await mobile.getByTestId("landing-create").click();
  await mobile.getByTestId("create-start-no").click();
  await mobile.getByTestId("create-language-en").click();
  await mobile.getByTestId("create-name").fill("Mobile User");
  await noOverflow("question");
  await mobile.screenshot({ path: join(shots, "mobile-question.png") });
  await mobile.getByTestId("create-next").click();
  for (let i = 0; i < 2; i++) await mobile.getByTestId("create-next").click(); // title, contact
  await mobile.getByTestId("create-worked-no").click(); // "Not yet" → projects are asked
  await mobile.getByTestId("create-education-institution").waitFor();
  await mobile.getByTestId("create-next").click();
  await mobile.getByTestId("create-project-name").waitFor();
  for (let i = 0; i < 4; i++) await mobile.getByTestId("create-next").click(); // projects, skills, languages, about
  await mobile.getByTestId("template-grid").waitFor();
  await noOverflow("templates");
  await mobile.screenshot({ path: join(shots, "mobile-templates.png") });
  await mobile.getByTestId("use-template-mobile").click();
  await mobile.getByTestId("preview").getByText("Mobile User").first().waitFor();
  await noOverflow("editor");
  await mobile.screenshot({ path: join(shots, "mobile-editor.png") });
  await mobile.getByTestId("view-edit").click();
  await mobile.getByLabel("Full name", { exact: true }).waitFor();
  await noOverflow("editor edit");
  step("phone: questions (first-job-seeker path), templates and editor fit with no horizontal scroll");

  const unexpected = external.filter((u) => !u.startsWith(`http://127.0.0.1:${aiPort}`) && !u.startsWith(modelBase));
  assert.deepEqual(unexpected, [], "unexpected cross-origin requests");
  const realErrors = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
  assert.deepEqual(realErrors, [], "console errors");
  console.log("\nAll smoke checks passed.");
} catch (error) {
  await page.screenshot({ path: join(shots, "failure.png") }).catch(() => {});
  console.error("\nSmoke test failed:", error);
  console.error("At:", page.url());
  if (errors.length) console.error("Console errors:", errors.slice(0, 5));
  process.exitCode = 1;
} finally {
  await browser.close();
  site.close();
  ai.close();
}
