# ThaFlow CV

A CV builder in the ThaFlow family, for Khmer and English. Someone answers a few questions, picks one
of 40 templates and downloads their CV as PDF or Word. There is no account and no CV database: the CV
lives in the person's browser (IndexedDB), and the app is a static site with nothing server-side to
store it in. AI is optional; everything works without it and offline. An existing CV can be brought in
from a PDF, a Word file, a scan or a photo, and is read on the device.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm test         # unit tests for the packages (Vitest)
pnpm typecheck
pnpm build        # static site in apps/web/out — host it anywhere
pnpm e2e          # browser test of the whole flow against the build (needs Playwright + Chromium)
```

`pnpm e2e` also imports a phone photo, a scanned PDF and a Khmer PDF when `THAFLOW_OCR_MODELS` points
at a folder holding ThaOCR's models (`textdet/db_v2.onnx`, `rec/crnn_m_v3_owner.onnx`,
`rec/crnn_m_v3_owner.vocab.json`); without it that part is skipped.

Two optional build-time settings for whoever hosts the site:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_THAFLOW_AI_URL` | Address of the cloud AI server, so people only have to switch cloud AI on. |
| `NEXT_PUBLIC_THAFLOW_OCR_MODELS` | Folder to fetch the reading models from instead of ThaOCR's public one (same file layout). |

The optional cloud AI server is separate: see [`apps/ai-server/README.md`](apps/ai-server/README.md).

## The product

| Route | Screen |
| --- | --- |
| `/` | The product page, for someone who has never used it: what it does and why it helps, a working demo, every part that does the work and where it runs, a live check of what *this* device can do, what does not work well yet, and questions. Every button leads to the dashboard. |
| `/dashboard/` | The app's home, laid out like ThaOCR: a sidebar (New CV, My CVs, Templates, Settings, Help), this device's chips, a drop zone (**New CV**, choose a file, camera on phones, drag or paste), and the most recent CVs with status, completeness and date. |
| `/dashboard/cvs/` | Every CV on this device; restore a backup, back up all; open, go through the questions, duplicate, back up or delete each. |
| `/dashboard/templates/` | All 40 designs shown with a sample CV, in English or Khmer; **Use this template** starts a CV with it. |
| `/dashboard/help/` | The device check, the parts and where they run, the limits and the questions from the product page. |
| `/create/` | One question per screen. From the dashboard it starts at the CV's language (or reads the file that was dropped). Opened directly, it first asks "Do you already have a CV?". |
| `/templates/?id=` | 40 templates, each rendered with the person's own answers. |
| `/editor/?id=` | The finished CV: preview, download (PDF, Word, backup file), and edit anything. |
| `/settings/` | Interface language, optional AI, local data (inside the dashboard). |

The look and the reasoning behind it are in [`docs/design.md`](docs/design.md). The checks the product
must pass are in [`docs/acceptance.md`](docs/acceptance.md).

## Layout

```
apps/
  web/              Next.js static PWA
  ai-server/        FastAPI, stateless. Only needed for the optional Cloud AI mode
packages/
  cv-core/          CV schema (Zod), factories, migrations, JSON backup format, dates  ← source of truth
  questionnaire/    The questions, their order and branching, as data and pure functions
  import-engine/    Reads an existing CV (PDF, Word, scan or photo) on the device: page layout, OCR, rule-based recogniser
  template-engine/  40 templates as configuration over one React/CSS renderer; print stylesheet
  export-engine/    Word (DOCX) renderer, PDF via browser print, backup download
  rule-engine/      Validation and quality rules, text classification, AI-output integrity checks
  storage/          Dexie/IndexedDB store: CVs, revisions, suggestions, settings
  ai-engine/        Provider interface, orchestrator, cloud provider, local-runtime adapter contract
  localization/     Interface messages (one module per screen) and in-document labels, English and Khmer
```

Packages are plain TypeScript with no Next.js dependency (only `template-engine` needs React), so a
desktop or native shell, or another ThaFlow product, can reuse them.

## The templates

Forty designs, every one a set of choices (page layout, header, section titles, where dates go, colour,
type) read by a single renderer, so a new template is configuration. Ten of them are the styles CVs are
most often set in here in Cambodia:

- **The standard sheet** (`sambor`, `chaktomuk`, and `vihear` for Khmer): the page is titled
  "Curriculum Vitae" (`vihear` puts the national motto above it), the photo stands at the top right, and
  every line is a label, a colon and its value: name, address, phone, then each school and job with its
  dates where a label would be.
- **Photo-led designs with a coloured side column** (`sesan`, `kravanh`, `kirirom`, `srepok`, `sangke`,
  `aoral`) and `banteay`: a large photo, contact details with small icons, section titles in pills, bars
  or bands.

These print the **personal details** a CV here usually states: sex, date and place of birth, nationality,
marital status, height and health. All are optional. They are one question in the flow, they sit with
the rest of "Personal" in the editor, and whatever is filled in is printed as its own section by every
template (it can be hidden or moved under Style like any other section).

## How the pieces fit

- **One document.** The questions and the editor write `CVDocument`; rules read it; the templates and
  the Word renderer render it; storage, import and backups validate it.
- **Importing an existing CV** happens entirely in the browser, in three steps.
  1. *Get the text and where it sits.* pdf.js (worker served from the app's own origin) reads a PDF's
     text, a zip reader reads Word. A picture, or a PDF without usable text (a scan, or most Khmer
     PDFs), is read by looking at the page: ThaOCR's text detector finds the lines and its Khmer and
     Latin recogniser reads them, in WebAssembly through ONNX Runtime served from this site.
  2. *Lay the page out.* Tall empty bands split the page into columns, which are read one after the
     other and carried across page breaks; date margins, label columns and small tables stay row by
     row; lines broken by a narrow column are joined again. A tilted photo is straightened first.
  3. *Recognise the CV.* Rules sort the lines into sections and fields. Only what is in the file is
     used; nothing is guessed, and personal data such as date of birth, gender or ID numbers is dropped
     (the person is asked for the personal details they want printed, like any other answer). A CV typed
     as a form is read row by row: "Name : Sok Dara", "Apply for : Cashier", a job's dates and its title.

  The reading models (24 MB) are fetched once, from where ThaOCR publishes them, the first time
  someone imports a picture or a scan; they are checked against known fingerprints and kept in the
  browser's cache. Only the models travel. The CV being read is never sent anywhere.
- **Rules own correctness.** Dates, email format, duplicates and completeness are deterministic rules
  with ids and localized messages. They never block a download.
- **AI owns wording only**, when the person turns it on. Output is schema-checked, compared with the
  original for invented numbers or claims, and shown as a suggestion next to the person's own text.
- **Cloud requests are minimal.** One field's text plus task and language. No ids, cookies or referrer.

## Brand

Colours, type and the logo follow ThaFlow and ThaOCR. Tokens live in `apps/web/app/globals.css`; the
mark is `apps/web/components/logo.tsx` (also `public/icon.svg` and `public/brand/thaflow-mark.svg`).

## Known limitations

- **Reading a picture takes time.** About 15 to 20 seconds a page on a laptop, longer on a phone,
  because the models run on one thread (more would need cross-origin isolation headers, which a plain
  static host does not send). At most six pages are read. The first use also downloads the models.
- **Text read from a picture can have wrong letters**, more so in small print, light text on a dark
  panel, or a blurred photo. The app says so and people review every answer. Handwriting is not
  supported. Pictures in HEIC or TIFF open only in browsers that can display them (Safari); elsewhere
  the app asks for a JPG or PNG.
- **Khmer PDFs** are read as pictures, because their text layer is usually unusable. That works, but
  it is slower than reading text and has the limits above. Khmer Word files are read exactly.
- **Importing depends on the layout.** It is tested against this app's 40 templates and against eight
  layouts made the way other tools lay CVs out (sidebars, narrow gutters, tables, dates in a margin),
  as text and as pictures. A design unlike any of those can still be read in the wrong order or lose
  entries: three-column grids and text boxes placed freely are the known weak spots.
- **Word layout.** Two-column templates export as one column so the file stays easy to edit, and page
  decoration (side-column fills, icons, pills' round ends) is left out. Khmer text names a Khmer font;
  Word shows it only if that font is installed.
- **A photo is added in the editor** (Personal → Photo), not in the questions, so the photo-led
  templates show their photo only after that.
- **On-device AI** has an interface but no bundled model yet.
- **Local storage is not encrypted** and browsers can evict it; the backup file is the real safeguard.
- **Verification** is automated in Chromium. Word files have not been opened in Microsoft Word, and
  Safari, Firefox and real phones are untested.
