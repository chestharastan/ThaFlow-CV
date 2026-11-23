# ThaFlow CV

A privacy-first CV builder for Khmer and English. No account, no CV database: the CV lives in the
user's browser (IndexedDB), and the app is a static site with nothing server-side to store it in.
AI is optional — creating, editing, checking and exporting a CV all work without it and offline.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm test         # unit tests for the packages (Vitest)
pnpm typecheck
pnpm build        # static site in apps/web/out — host it anywhere
pnpm e2e          # browser smoke test against the build (needs Playwright + Chromium)
```

The optional cloud AI server is separate: see [`apps/ai-server/README.md`](apps/ai-server/README.md).

## Layout

```
apps/
  web/              Next.js static PWA: Home, New CV, Guided questions, Editor, Settings
  ai-server/        FastAPI, stateless. Only needed for the optional Cloud AI mode
packages/
  cv-core/          CV schema (Zod), factories, migrations, JSON backup format, dates  ← source of truth
  rule-engine/      Rule registry, validation/quality rules, classification, AI-output integrity checks
  storage/          Dexie/IndexedDB store: CVs, revisions, suggestions, settings
  questionnaire/    Step order per audience and progress, written against the CV schema
  template-engine/  10 templates as configuration over one React/CSS renderer; print stylesheet
  export-engine/    DOCX renderer, PDF via browser print, backup download
  ai-engine/        Provider interface, orchestrator, cloud provider, local-runtime adapter contract
  localization/     UI messages and in-document labels, English and Khmer
```

Packages are plain TypeScript with no Next.js dependency (only `template-engine` needs React), so a
desktop or native shell can reuse them.

## How the pieces fit

- **One document.** The questionnaire and editor write `CVDocument`; rules read it; templates and
  the DOCX renderer render it; storage and backups validate it through `migrateCV`.
- **Rules own correctness.** Dates, email format, duplicates, completeness and vague wording are
  deterministic rules with ids (`DATE-002`, `SKL-001`, …), each with a severity and localized
  message. They never block export.
- **AI owns wording only.** The orchestrator picks a provider from the user's explicit choice, never
  falls back from local to cloud, validates output against a schema, and runs integrity checks that
  flag numbers or claims not present in the user's text. Results become *suggestions* shown next to
  the original; nothing changes until the user accepts, and accepted text can be restored.
- **Cloud requests are minimal.** One field's text plus task and language. No ids, cookies or
  referrer. The server rejects unknown fields, stores nothing and logs no bodies.

## Status against the specification

| Area | State |
| --- | --- |
| Multiple local CVs, autosave, undo/redo, revisions, duplicate, delete, clear all data | Done |
| Guided questionnaire per audience; full manual editor; section reorder/hide | Done |
| Rule engine (21 rules), completeness score, inline field errors | Done |
| 10 templates, accent colour, fonts, live preview | Done |
| PDF (browser print), DOCX (own renderer), JSON backup and restore | Done |
| Khmer + English UI and documents, bundled Khmer fonts | Done |
| Offline app shell (service worker), installable PWA | Done |
| Cloud AI: consent gate, rewrite, translate, free-text extraction, stateless server | Done; server's Claude provider not exercised against the live API in this repo's tests |
| On-device AI | Interface only (`LocalRuntime`). No model is bundled until one passes device and Khmer evaluation |
| Import existing CV from PDF/DOCX, job matching, cover letters | Not started |
| Optional passphrase encryption of local data | Not started |

## Known limitations

- **PDF pagination.** Multi-page CVs print, but pages after the first have no top margin, and a
  sidebar's background colour stops at the end of the content on later pages.
- **DOCX layout.** Two-column templates export as one column so the file stays easy to edit. Khmer
  text names a Khmer font; Word shows it only if that font is installed.
- **Khmer checks.** Wording rules (vague/informal language) are English-only. Structural rules apply
  to both languages.
- **Local storage is not encrypted** and browsers can evict it; the app requests persistent storage
  and prompts for backups, but a backup file is the only real safeguard.
- **Verification so far** is automated (Chromium). DOCX has not been opened in Microsoft Word, and
  Safari/Firefox and real phones are untested.

## Deviations from the proposed stack

- Plain controlled inputs with a field-definition table instead of React Hook Form: every form
  writes straight into the one CV document, which is what undo/redo and autosave operate on.
- A small in-repo translator instead of `next-intl`: the site is a static export with client-side
  language switching and no locale routes.
