/**
 * Makes the "foreign" CV fixtures: the same CV laid out the way other tools
 * (Word, Canva, online builders) lay CVs out, printed to PDF and to PNG.
 * The importer is tested against them because real CVs do not come from our
 * own templates.
 *
 *   node packages/import-engine/scripts/foreign/make.mjs
 *
 * Needs Playwright with Chromium. The PDFs go to packages/import-engine/test/fixtures/foreign/ and are
 * committed, as are a scan and a phone photo in test/fixtures/pictures/ for the picture reader; the
 * full-size PNGs go to packages/import-engine/scripts/out/foreign/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "test", "fixtures", "foreign");
const images = join(here, "..", "out", "foreign");
mkdirSync(out, { recursive: true });
mkdirSync(images, { recursive: true });

const cv = {
  name: "Dara Sok",
  title: "DATA SCIENCE & ENGINEERING",
  email: "dara.sok@example.com",
  phone: "+855 12 345 678",
  address: "Sangkat Tek Thla, Khan Sen Sok, Phnom Penh",
  profile:
    "Final-year engineering student who builds machine learning systems for the Khmer language. I enjoy turning research into tools people can use, and teaching what I learn.",
  skills: [
    ["Programming", "Python, SQL, JavaScript, TypeScript"],
    ["Web & Mobile", "React, Next.js, Django, FastAPI, Flutter"],
    ["Machine Learning", "PyTorch, TensorFlow, Scikit-learn, OpenCV, Hugging Face"],
    ["Data", "PostgreSQL, MySQL, Matplotlib, Seaborn"],
    ["Tools", "Git/GitHub, Linux, Microsoft Office"],
  ],
  jobs: [
    {
      title: "Teaching Assistant",
      org: "Royal University of Phnom Penh",
      dates: "Apr 2025 – Apr 2026",
      points: ["Supported the Data Science and Programming course for 120 students", "Marked weekly labs and ran revision sessions before exams"],
    },
    {
      title: "Student Ambassador",
      org: "Faculty of Engineering, RUPP",
      dates: "2023 – 2024",
      points: ["Welcomed new students and led campus tours for visiting schools", "Organised two open days with the faculty office"],
    },
  ],
  projects: [
    {
      name: "Khmer OCR Thesis & ThaOCR (Ongoing)",
      points: ["Text recognition, speech recognition (Whisper), training data creation, accuracy testing (CER/WER)", "Built with PyTorch, CTC and BiLSTM; models shared on Hugging Face and Kaggle"],
    },
    { name: "Web & Mobile Apps", points: ["Built course projects with React, Django and Flutter for local small businesses"] },
  ],
  school: { name: "Royal University of Phnom Penh (RUPP)", degree: "Bachelor of Engineering in Data Science and Engineering", dates: "2021 – 2025" },
  languages: [
    ["Khmer", "Native"],
    ["English", "Fluent"],
  ],
};

const ul = (points) => `<ul>${points.map((p) => `<li>${p}</li>`).join("")}</ul>`;
const h = (text, cls = "") => `<h2 class="${cls}">${text}</h2>`;

const blocks = {
  profile: (title = "PROFILE") => `${h(title)}<p>${cv.profile}</p>`,
  skillsLabelled: (title = "SKILLS") => `${h(title)}${cv.skills.map(([k, v]) => `<p class="tight"><b>${k}:</b> ${v}</p>`).join("")}`,
  skillsStacked: (title = "SKILLS") => `${h(title)}${cv.skills.map(([k, v]) => `<p class="tight"><b>${k}</b><br>${v}</p>`).join("")}`,
  skillsChips: (title = "SKILLS") =>
    `${h(title)}<div class="chips">${cv.skills
      .flatMap(([, v]) => v.split(", "))
      .map((s) => `<span>${s}</span>`)
      .join("")}</div>`,
  skillsTable: (title = "SKILLS") => `${h(title)}<table>${cv.skills.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</table>`,
  skillsBullets: (title = "SKILLS") => `${h(title)}${ul(cv.skills.map(([, v]) => v))}`,
  jobsDatesRight: (title = "EXPERIENCE") =>
    `${h(title)}${cv.jobs.map((j) => `<div class="entry"><div class="row"><b>${j.title}</b><span>${j.dates}</span></div><div class="sub">${j.org}</div>${ul(j.points)}</div>`).join("")}`,
  jobsDatesBelow: (title = "EXPERIENCE") =>
    `${h(title)}${cv.jobs.map((j) => `<div class="entry"><b>${j.title}</b><div class="sub">${j.org}</div><div class="sub">${j.dates}</div>${ul(j.points)}</div>`).join("")}`,
  jobsDatesLeft: (title = "EXPERIENCE") =>
    `${h(title)}${cv.jobs.map((j) => `<div class="entry dated"><div class="when">${j.dates}</div><div><b>${j.title}</b><div class="sub">${j.org}</div>${ul(j.points)}</div></div>`).join("")}`,
  jobsOneLine: (title = "WORK EXPERIENCE") =>
    `${h(title)}${cv.jobs.map((j) => `<div class="entry"><b>${j.title}</b> | ${j.org} | ${j.dates}${ul(j.points)}</div>`).join("")}`,
  projects: (title = "PROJECTS") => `${h(title)}${cv.projects.map((p) => `<div class="entry"><b>${p.name}</b>${ul(p.points)}</div>`).join("")}`,
  education: (title = "EDUCATION") =>
    `${h(title)}<div class="entry"><b>${cv.school.name}</b><div class="sub">${cv.school.degree}</div><div class="sub">${cv.school.dates}</div></div>`,
  educationRow: (title = "EDUCATION") =>
    `${h(title)}<div class="entry"><div class="row"><b>${cv.school.degree}</b><span>${cv.school.dates}</span></div><div class="sub">${cv.school.name}</div></div>`,
  languages: (title = "LANGUAGES") => `${h(title)}${cv.languages.map(([k, v]) => `<p class="tight">${k} — ${v}</p>`).join("")}`,
  contactStack: (title = "CONTACT") => `${h(title)}<p class="tight">${cv.email}</p><p class="tight">${cv.phone}</p><p class="tight">${cv.address}</p>`,
};

const base = `
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font: 10pt/1.45 Arial, Helvetica, sans-serif; color: #1c1c1c; }
  h1 { font-size: 26pt; line-height: 1.1; margin: 0; }
  h2 { font-size: 11pt; letter-spacing: .06em; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #999; }
  p { margin: 0 0 6pt; }
  p.tight { margin: 0 0 3pt; }
  ul { margin: 3pt 0 0; padding-left: 14pt; }
  .entry { margin-bottom: 9pt; }
  .row { display: flex; justify-content: space-between; gap: 12pt; }
  .row span { flex: none; white-space: nowrap; }
  .sub { color: #444; }
  .title { font-size: 11pt; letter-spacing: .12em; margin-top: 4pt; }
  .contact { margin-top: 6pt; color: #333; }
  .page { padding: 16mm 15mm; }
  .cols { display: flex; }
  .chips span { display: inline-block; border: 1px solid #888; border-radius: 3pt; padding: 1pt 5pt; margin: 0 3pt 4pt 0; font-size: 9pt; }
  table { border-collapse: collapse; }
  td { vertical-align: top; padding: 0 0 3pt; }
  td.k { font-weight: bold; padding-right: 14pt; white-space: nowrap; }
  .dated { display: flex; gap: 14pt; }
  .dated .when { flex: 0 0 92pt; color: #444; }
`;

const header = (extra = "") =>
  `<header><h1>${cv.name}</h1><div class="title">${cv.title}</div><div class="contact">${cv.email} &nbsp;|&nbsp; ${cv.phone} &nbsp;|&nbsp; ${cv.address}</div>${extra}</header>`;

/** Each layout: a name, extra CSS and the page body. */
const layouts = [
  {
    // A header across the page, then a narrow column of skills beside the main text.
    id: "sidebar-left",
    css: `.side { flex: 0 0 31%; padding-right: 14pt; } .main { flex: 1; }`,
    body: `<div class="page">${header()}<div class="cols"><div class="side">${blocks.skillsStacked()}${blocks.education()}${blocks.languages()}</div><div class="main">${blocks.profile()}${blocks.jobsDatesRight()}${blocks.projects()}</div></div></div>`,
  },
  {
    // The same, mirrored, with the contact details in the sidebar.
    id: "sidebar-right",
    css: `.side { flex: 0 0 30%; padding-left: 16pt; } .main { flex: 1; }`,
    body: `<div class="page"><div class="cols"><div class="main"><h1>${cv.name}</h1><div class="title">${cv.title}</div>${blocks.profile("ABOUT ME")}${blocks.jobsDatesBelow("WORK EXPERIENCE")}${blocks.projects()}</div><div class="side">${blocks.contactStack()}${blocks.skillsBullets("TECHNICAL SKILLS")}${blocks.education()}${blocks.languages()}</div></div></div>`,
  },
  {
    // Two equal columns with a narrow gap, the address above the title, and skills written as labelled lines.
    id: "narrow-gutter",
    css: `header { text-align: center; } .cols { gap: 11pt; } .cols > div { flex: 1; } h2 { border: 0; background: #e8e8e8; padding: 3pt 5pt; }`,
    body: `<div class="page"><header><h1>${cv.name}</h1><div class="contact">${cv.address}</div><div class="contact">${cv.phone} · ${cv.email}</div><div class="title">${cv.title}</div></header><div class="cols"><div>${blocks.skillsLabelled()}${blocks.education()}${blocks.languages()}</div><div>${blocks.jobsDatesBelow()}${blocks.projects()}</div></div></div>`,
  },
  {
    // A dark sidebar holding the name, contact details and skills as tags.
    id: "sidebar-dark",
    css: `.cols { min-height: 297mm; } .side { flex: 0 0 34%; background: #1f2d3d; color: #fff; padding: 16mm 9mm; } .side h2 { border-color: #7f8ea0; } .side .sub { color: #cfd8e3; } .side .chips span { border-color: #9fb0c3; } .main { flex: 1; padding: 16mm 12mm; } .side h1 { font-size: 22pt; }`,
    body: `<div class="cols"><div class="side"><h1>${cv.name}</h1><div class="title">${cv.title}</div>${blocks.contactStack()}${blocks.skillsChips()}${blocks.languages()}</div><div class="main">${blocks.profile()}${blocks.jobsDatesRight()}${blocks.projects()}${blocks.educationRow()}</div></div>`,
  },
  {
    // One column, with the skills in a small table and dates set to the right.
    id: "table",
    css: ``,
    body: `<div class="page">${header()}${blocks.profile("SUMMARY")}${blocks.skillsTable()}${blocks.jobsDatesRight("PROFESSIONAL EXPERIENCE")}${blocks.projects()}${blocks.educationRow()}${blocks.languages()}</div>`,
  },
  {
    // A plain document, the way it comes out of a word processor: labelled contact lines, everything stacked.
    id: "plain",
    css: `body { font-family: "Times New Roman", Times, serif; font-size: 11pt; } h1 { font-size: 20pt; text-align: center; } h2 { border: 0; text-decoration: underline; letter-spacing: 0; }`,
    body: `<div class="page"><h1>${cv.name}</h1><p style="text-align:center">${cv.title}</p><p class="tight">Address: ${cv.address}</p><p class="tight">Phone: ${cv.phone}</p><p class="tight">Email: ${cv.email}</p>${blocks.profile("Objective")}${blocks.education("Education")}${blocks.jobsOneLine("Work Experience")}${blocks.projects("Projects")}${blocks.skillsBullets("Skills")}${blocks.languages("Languages")}</div>`,
  },
  {
    // Two columns in the middle of the page, with full-width sections above and below them.
    id: "mixed",
    css: `.cols { gap: 18pt; } .cols > div { flex: 1; }`,
    body: `<div class="page">${header()}${blocks.profile()}<div class="cols"><div>${blocks.jobsDatesBelow()}</div><div>${blocks.skillsLabelled()}${blocks.languages()}</div></div>${blocks.projects()}${blocks.educationRow()}</div>`,
  },
  {
    // Dates in a margin on the left of every entry.
    id: "dates-left",
    css: ``,
    body: `<div class="page">${header()}${blocks.profile()}${blocks.jobsDatesLeft()}${blocks.projects()}${blocks.education()}${blocks.skillsLabelled()}</div>`,
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
for (const layout of layouts) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${base}${layout.css}</style></head><body>${layout.body}</body></html>`);
  writeFileSync(join(out, `${layout.id}.pdf`), await page.pdf({ format: "A4", printBackground: true }));
  writeFileSync(join(images, `${layout.id}.png`), await page.screenshot({ fullPage: true }));
  console.log(layout.id);
}

// Two harder inputs made from one of the layouts, for the picture reader: a scan (a PDF that is nothing but
// a picture of the page) and a "phone photo" (paper lying at an angle under uneven light, saved as a JPEG).
const pictures = join(here, "..", "..", "test", "fixtures", "pictures");
mkdirSync(pictures, { recursive: true });
const sheet = `data:image/png;base64,${readFileSync(join(images, "sidebar-left.png")).toString("base64")}`;
await page.setContent(`<html><body style="margin:0"><img src="${sheet}" style="width:210mm;display:block"></body></html>`);
writeFileSync(join(pictures, "scan.pdf"), await page.pdf({ format: "A4", printBackground: true }));
const desk = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1 });
await desk.setContent(`<html><body style="margin:0;background:#6b6257;width:1000px;height:1400px;overflow:hidden">
  <div style="position:absolute;left:70px;top:60px;width:840px;transform:perspective(2600px) rotateX(5deg) rotateZ(-2.2deg);box-shadow:0 10px 40px rgba(0,0,0,.5)">
    <img src="${sheet}" style="width:100%;display:block;filter:contrast(.92) brightness(.97)">
    <div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.22))"></div>
  </div></body></html>`);
writeFileSync(join(pictures, "phone-photo.jpg"), await desk.screenshot({ type: "jpeg", quality: 62 }));
console.log("pictures");
await browser.close();
