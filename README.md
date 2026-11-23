# ThaFlow CV

A CV builder in the ThaFlow family, for Khmer and English. Someone answers a few questions, picks one
of 30 templates and downloads their CV as PDF or Word. There is no account and no CV database: the CV
lives in the person's browser (IndexedDB), and the app is a static site with nothing server-side to
store it in. AI is optional; everything works without it and offline.

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

The optional cloud AI server is separate: see [`apps/ai-server/README.md`](apps/ai-server/README.md).

## The product

| Route | Screen |
| --- | --- |
| `/` | What this does, and **Create CV**. CVs already on this device are listed underneath. |
| `/create/` | One question per screen. First: "Do you already have a CV?" If yes, a PDF or Word file can be read on the device to fill in the answers; otherwise, or if they prefer, they type. |
| `/templates/?id=` | 30 templates, each rendered with the person's own answers. |
| `/editor/?id=` | The finished CV: preview, download (PDF, Word, backup file), and edit anything. |
| `/settings/` | Interface language, optional AI, local data. |

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
  import-engine/    Reads an existing CV from PDF or Word on the device and recognises its contents with rules
  template-engine/  30 templates as configuration over one React/CSS renderer; print stylesheet
  export-engine/    Word (DOCX) renderer, PDF via browser print, backup download
  rule-engine/      Validation and quality rules, text classification, AI-output integrity checks
  storage/          Dexie/IndexedDB store: CVs, revisions, suggestions, settings
  ai-engine/        Provider interface, orchestrator, cloud provider, local-runtime adapter contract
  localization/     Interface messages (one module per screen) and in-document labels, English and Khmer
```

Packages are plain TypeScript with no Next.js dependency (only `template-engine` needs React), so a
desktop or native shell, or another ThaFlow product, can reuse them.

## How the pieces fit

- **One document.** The questions and the editor write `CVDocument`; rules read it; the templates and
  the Word renderer render it; storage, import and backups validate it.
- **Importing an existing CV** happens entirely in the browser: pdf.js (worker served from the app's
  own origin) or a zip reader extracts lines with layout hints, and a rule-based recogniser sorts them
  into sections. Only what is in the file is used; nothing is guessed, and personal data such as date
  of birth, gender or ID numbers is dropped.
- **Rules own correctness.** Dates, email format, duplicates and completeness are deterministic rules
  with ids and localized messages. They never block a download.
- **AI owns wording only**, when the person turns it on. Output is schema-checked, compared with the
  original for invented numbers or claims, and shown as a suggestion next to the person's own text.
- **Cloud requests are minimal.** One field's text plus task and language. No ids, cookies or referrer.

## Brand

Colours, type and the logo follow ThaFlow and ThaOCR. Tokens live in `apps/web/app/globals.css`; the
mark is `apps/web/components/logo.tsx` (also `public/icon.svg` and `public/brand/thaflow-mark.svg`).

## Known limitations

- **Khmer PDFs cannot be imported reliably.** PDF files usually store Khmer as glyphs without the
  letters behind them, so the text comes out damaged. The app detects this and says so rather than
  importing wrong letters. Khmer Word files import correctly.
- **Importing from PDF depends on the layout.** In testing against this app's own templates, 23 of 25
  English layouts were read completely; unusual designs lose some entries, and a name set in
  letter-spaced capitals can lose the space between words. People review every answer before it is used.
- **Scanned CVs** have no text to read. (ThaOCR is the ThaFlow product for that.)
- **Word layout.** Two-column templates export as one column so the file stays easy to edit. Khmer
  text names a Khmer font; Word shows it only if that font is installed.
- **On-device AI** has an interface but no bundled model yet.
- **Local storage is not encrypted** and browsers can evict it; the backup file is the real safeguard.
- **Verification** is automated in Chromium. Word files have not been opened in Microsoft Word, and
  Safari, Firefox and real phones are untested.
