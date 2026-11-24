# ThaFlow CV design

What the product is meant to feel like, and why. Read this before changing the interface.

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
| `/templates/?id=<cvId>` | Choose a template | 40 templates, each rendered with this person's own answers. Pick one, continue. |
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

## The CVs people expect here

> The product owner later sent the designs CVs are sold in locally (the standard "label : value" sheet in
> English and in Khmer, and photo-led designs with a coloured side column) with: *"make like those design"*.

Ten templates follow them (see the README). What that asked of the product, beyond new looks:

- **Personal details are part of a CV here**: sex, date and place of birth, nationality, marital status,
  often height and health. They are optional, asked on one screen after the contact details ("Skip" while
  it is empty, like every optional question), and printed as their own section by every template.
- **The standard sheet is a form.** Its header, its personal details, and every school, job, skill group
  and language are rows of a label, a colon and a value, with the colons in one column down the page.
- **A photo matters.** Half the templates have a slot for one; it is added in the editor.
- These pages carry colour and decoration (filled side columns, pills, bands). That belongs to the CV a
  person chooses, never to the interface, which stays as described below.

## Design language

> The product owner's follow-up after seeing the first direction, in their words: *"Make this more professional … like that logo [the cream ThaFlow
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
