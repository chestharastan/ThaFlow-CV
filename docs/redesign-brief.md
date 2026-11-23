# ThaFlow CV redesign brief

This is the shared brief for the redesign. Read all of it before changing anything.

## What the product owner asked for

In their words (lightly trimmed):

> I want all redesign. I want to make it simple. When the user goes there, make it show what we do.
> I want simple design, and it has "create CV" there. Ask if they have a CV or not; if they have,
> do they want to input it or not; and if they have one but don't want to give it, treat them like a
> new user and ask them for the information. Create 30 templates of the CV. In this design I just
> want text and the white background. Don't make it show the "how to use" — make it into the UX
> (if you design the best UX the user knows it; we don't need extra text telling them what is doing
> what). Just a question and a box for the user to input it, then Next to go to the next question,
> like that. After asking all the questions, go to choosing the CV template. Simple and modern.
> Use between black and white, and the ThaFlow logo. The system is under ThaFlow — an independent
> system, I will centralize it later. Colour between ThaFlow and black to white, can be gray; just
> make it fit.

## The flow

| Route | Screen | What it is |
| --- | --- | --- |
| `/` | Landing | One or two sentences on what this does, and one button: **Create CV**. If CVs already exist on this device, a plain text list of them underneath. |
| `/create/` | Questions | One question per screen, a box (or a few closely related boxes) to answer, **Next**. First: "Do you already have a CV?" → if yes, "use it?" → choose a PDF/Word file (read on the device) or type instead. Then the same questions for everyone, pre-filled when a file was read. |
| `/templates/?id=<cvId>` | Choose a template | 30 templates, each rendered with this person's own answers. Pick one, continue. |
| `/editor/?id=<cvId>` | Your CV | The finished CV: preview, download (PDF / Word), and edit anything. |
| `/settings/` | Settings | Interface language, optional AI, local data. Reached from a small text link, not promoted. |

Navigation contract (all client-side, static export, trailing slashes):

- Landing → `/create/`.
- `/create/` runs the opening questions with no CV yet, creates the CV in IndexedDB, then continues at
  `/create/?id=<cvId>&q=<questionId>`. Every question is a URL, so the browser Back button goes to the
  previous question and a reload resumes where the person was.
- Last question → `/templates/?id=<cvId>`.
- Confirming a template → `/editor/?id=<cvId>`. The editor's "Template" action links back to
  `/templates/?id=<cvId>`.
- An unknown or missing id shows a short not-found message with a link home. Never a blank page.

## Design language

> **This section was updated after the product owner reviewed the first direction and it takes
> precedence over anything in your task description that conflicts with it** (for example "text on
> white", "white page", "no cards", or using `bg-paper` for the page).
>
> Their follow-up, in their words: *"Make this more professional … like that logo [the cream ThaFlow
> mark], not the black one; the black is just a variant. Similar to that design [ThaOCR] but I want
> it more simple. Make it simple and feel professional and premium."*

**The ThaFlow family look, made simpler.** ThaFlow CV is a sibling of ThaOCR and should look like it
belongs to the same family. Open the reference screenshots before you design anything:
`docs/design/reference/thaocr-scan-desktop.png`, `thaocr-scan-mobile.png`, `thaocr-settings-desktop.png`,
`thaocr-welcome-desktop.png`, and `thaflow-home-desktop.jpg` (the parent brand site).

What to take from ThaOCR:

- A warm off-white page (`bg-canvas`, already on `<body>`), with **white surfaces** (`bg-paper`) for the
  things people touch or read on: inputs, option buttons, the few cards, menus, the CV sheet.
- Near-black ink for text and for the one primary button. **Cream (`bg-cream`) is the only tint**: the
  selected option, the active item, a small chip behind an icon. No blue, no other hue.
- Hairline borders (`border-line`), soft corners (`rounded-lg` 8px controls, `rounded-xl` 12px large
  controls, `rounded-2xl` 16px cards), and a barely-there shadow (`shadow-soft`) on raised controls.
- Inter, with confident headings (weight 600–650, tight tracking) and calm 14–16px body text.
- The real logo: `<Logo />` (cream stone mark + wordmark) from `components/logo.tsx`.

What to leave out, because this must be **simpler** than ThaOCR:

- No sidebar, no row of status chips, no welcome dialog, no feature bullets, no icon grid.
- One column, one thing at a time. A screen is a heading, the thing to do, and one primary button.
- Cards only where they group something real (a list of saved CVs, a settings group, a selectable
  option). Never a card around a single line of text, and never cards inside cards.
- Icons only where they carry meaning on their own (back arrow, close, download, check). Thin line
  icons drawn inline as SVG with `stroke="currentColor"` and 1.5–1.75 stroke width, like ThaOCR's.
  No emoji, no illustrations, no decorative icons.

What makes it feel **professional and premium** is restraint and precision, not decoration:

- One spacing rhythm, used consistently. Edges line up. Generous space around the one thing that matters.
- Exactly one filled (black) button per screen; everything else is outlined or plain text.
- Considered states: hover, focus (crisp ring), selected (cream fill + ink border), disabled, empty,
  loading, error. Nothing jumps or flashes.
- Short, confident wording. No exclamation marks.
- Colour comes only from the tokens in `apps/web/app/globals.css`. **Do not use any other Tailwind
  palette colour** (`slate-*`, `blue-*`, `emerald-*`, `brand-600`, …): replace every one you find in
  files you own.
- Type sizes: page or question heading `text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em]`
  (`leading-tight`); landing headline may go larger; body `text-[15px]`/`text-base`; secondary text
  `text-muted`; `text-faint` only for placeholders and disabled text (it fails contrast for content).
- Narrow measure: `max-w-xl` for questions, `max-w-2xl` for the landing page.
- Motion is one small thing: `animate-enter` when a new question or screen appears. Nothing else moves.

**No "how to use".** The interface explains itself or it is wrong.

- No "how it works" sections, numbered steps, onboarding tips, tooltips that explain the UI, helper
  paragraphs, or sentences that narrate what the app is doing ("We'll now ask you…").
- A screen is: the question, the box, the button. Labels are short nouns. Examples go in placeholders.
- Text earns its place only when the person would otherwise be unsure about something that matters:
  that their file is read on the device and not uploaded (one short line at the moment they choose a
  file), a confirmation before deleting, and error messages. Keep those to one line.
- Optional questions need no explanation: the button simply reads "Skip" while the box is empty.

**Works for everyone.**

- Mobile first. 360px wide must work with no horizontal scroll; touch targets at least 44px tall.
- Keyboard: Enter moves to the next question (Ctrl/Cmd+Enter in multi-line boxes); visible focus; the
  first box is focused when a question appears.
- Every control has an accessible name. A question's heading labels its single box (`aria-labelledby`).
- **Khmer is a first-class language.** Every string goes through `t()` with an entry in both the `en`
  and `km` message modules. Check each screen in Khmer: longer strings must not overflow, and nothing
  may rely on uppercase, italics or letter-spacing (Khmer has none; the global CSS already zeroes
  letter-spacing in Khmer).

## Shared code (already in place — do not edit)

| File | What it gives you |
| --- | --- |
| `apps/web/app/globals.css` | Tokens: `bg-canvas` (page), `bg-paper` (surfaces), `bg-surface` (quiet fill), `bg-cream` / `bg-cream-strong` (the one tint), `text-ink`, `text-ink-soft`, `text-muted`, `text-faint`, `border-line`, `border-line-strong`, `bg-brand`, `text-on-brand`, `text-danger`, `bg-danger-soft`, `text-warn`, `bg-warn-soft`, `text-ok`, `bg-ok-soft`, `shadow-soft`, `shadow-pop`, `shadow-page`, `animate-enter`. |
| `apps/web/components/ui.tsx` | `Button` (`variant`: primary / secondary / ghost / danger; `size`: sm / md / lg), `Field`, `TextInput`, `TextArea`, `Select` (all take `controlSize`: sm / md / lg), `TagInput`, `Card` (white, hairline, 16px radius), `cx`. |
| `apps/web/components/app-header.tsx` | `AppHeader` (logo left linking home, `center` slot, actions as children) and `LanguageToggle`. Use this header on every screen. |
| `apps/web/components/logo.tsx` | `Logo` (the ThaFlow mark + wordmark) and `LogoMark` (the mark alone). |
| `apps/web/lib/app-context.tsx` | `useApp()` → `{ t, settings, updateSettings, ready }`; `getStore()` → the IndexedDB store (`listCVs`, `getCV`, `saveCV`, `deleteCV`, `duplicateCV`, …). |
| `apps/web/lib/editor-store.ts` | `useEditor()` zustand store for the CV being worked on: `load(id)`, `cv`, `status` (`loading` / `ready` / `missing`), `update(mutator, coalesceKey?)`, `replace(cv)`, `undo`, `redo`, `flush()`, `saveState`. Autosaves to IndexedDB. Use it on every screen that edits a CV. |
| `apps/web/lib/ai.ts` | `useAI()` (optional AI; off by default). |
| `packages/cv-core` | `CVDocument` schema, factories (`createEmptyCV`, `createExperience`, …), dates helpers. The CV document is the single source of truth: screens read and write it, nothing else. |
| `packages/storage`, `packages/rule-engine`, `packages/ai-engine`, `packages/export-engine/src/browser.ts` | Storage, rules, AI orchestration, download/print helpers. |
| `packages/localization/src/translator.ts`, `messages/*/index.ts`, `messages/*/common.ts` | Translator and shared strings (`field.*`, `section.*`, `action.*`, `add.*`, …). |

If you need something from a shared file that is not there, build it inside your own area and list it
under "requests for the integrator" in your final report. Do not edit shared files.

## Contracts between areas

**Messages.** One module per area, English and Khmer side by side:
`packages/localization/src/messages/{en,km}/{common,landing,create,gallery,editor,settings}.ts`.
Each area owns its module in both languages and may freely add, rename and delete keys in it. English
defines the keys (`as const`); Khmer is `Partial<Record<keyof typeof en, string>>`. Reuse `common.*`
keys where they fit; do not edit `common.ts`. Prefix your keys with your area name to avoid clashes.

**CV import** — `@thaflow/import-engine` (`packages/import-engine/src/types.ts` is the contract):

```ts
importCVFile(file: File, options?: { pdfWorkerSrc?: string }): Promise<ImportResult>  // throws ImportError(code)
createCVFromImport(data: ImportedCV, base?: CVDocument): CVDocument
isImportEmpty(data: ImportedCV): boolean
detectImportSource(file): "pdf" | "docx" | null
MAX_IMPORT_BYTES
```

In the web app, pass `pdfWorkerSrc: "/pdf.worker.min.mjs"` (copied into `public/` by
`apps/web/scripts/copy-pdf-worker.mjs`, which runs before `dev` and `build`). The current
implementation is a placeholder returning fixed sample data; the real one is being written in parallel
against the same signatures.

**Templates** — `@thaflow/template-engine`:

```ts
templates: CVTemplate[]            // the registry, in display order (10 today, 30 after the redesign)
getTemplate(id): CVTemplate        // unknown ids fall back to the first template
TEMPLATE_CATEGORIES                // ["simple", "modern", "classic", "creative"]; template.category is one of these
<CVPreview cv template? pageStyle? />   // pure render of a CV; pageStyle emits the @page rule (use on the printed copy only)
resolveAppearance, COLOR_PRESETS, FONT_OPTIONS, templateCss, printCss
```

A template is identified by `template.id` and shown by `template.name`. The CV stores its choice in
`cv.appearance.templateId`. Code outside the template engine must not depend on any other template
field except `category` and `layout.columns`.

**Questions** — `@thaflow/questionnaire` defines the question list and its branching as data and pure
functions over the CV document; the web app only renders it.

## Working rules

- You are working in your own git worktree of the repository. Start with `pnpm install --prefer-offline`
  at the repository root.
- Stay inside the files you were given. Other people are changing the rest at the same time.
- `pnpm typecheck` and `pnpm test` must pass when you finish. The old end-to-end script
  (`apps/web/e2e/smoke.mjs`) describes the previous design and is expected to fail; leave it alone.
- Look at what you build. For interface work, run the app (`node apps/web/scripts/copy-pdf-worker.mjs`,
  then `pnpm --filter @thaflow/web exec next dev -p <your port>`) and take Playwright screenshots
  (`require("playwright")` works from any directory; `chromium.launch()` needs no options) at
  1280×800 and 390×844, in English and in Khmer. Read the screenshots and fix what looks wrong
  before you finish. Stop your dev server when you are done.
- Finish by committing everything in your worktree (do not push), then run
  `git branch -f redesign/<your-area> HEAD` so the work can be found, and report the commit SHA.
- Do not add dependencies. Everything needed is installed; if something is truly missing, say so in
  your report instead of installing it.
