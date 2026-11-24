# Acceptance checks

Each row is checked by an automated test. `e2e` is `apps/web/e2e/smoke.mjs`, run against the production build.

| Promise | Where it is checked |
| --- | --- |
| The product page explains what it does, has a working demo, lists every part and where it runs, and checks this device | e2e; `apps/web/test/device.test.ts` (verdicts for laptops, phones, small machines, blocked storage, no WebAssembly) |
| The dashboard: a sidebar like ThaOCR's (collapsible, a menu on phones), device chips, a drop zone, recent CVs | e2e (desktop and phone) |
| A new person can create a CV with no AI | e2e: product page → dashboard → questions → templates → finished CV |
| Every question is a URL; Back and reload lose nothing | e2e; `questionnaire.test.ts` (branching, next/previous) |
| "Not yet" worked → projects are asked | e2e (phone run); `questionnaire.test.ts` |
| An existing CV is read on the device | e2e: a Word file dropped in from the dashboard, and PDFs through "Do you already have a CV?", pre-fill the answers, with zero network requests; `import.test.ts` |
| A CV typed as a form is read row by row, and its personal data is not carried over | `import.test.ts` (English and Khmer forms, every template's Word export), `layout.test.ts`; e2e imports the standard sheet's PDF |
| A CV from another tool is read in the right order | `foreign.test.ts`: eight layouts (sidebars, narrow gutter, table, dates in a margin) all yield the same person, jobs, school, projects and skills; e2e imports one; `layout.test.ts` |
| A photo, a scan or a Khmer PDF is read on the device | e2e with `THAFLOW_OCR_MODELS` set: a tilted phone photo, a scanned PDF and a Khmer PDF are imported; only the three model files are fetched, once; `ocr.test.ts` |
| Files that are not a CV are refused with a reason | e2e; `import.test.ts` |
| 40 distinct templates, all render in English and Khmer | `registry.test.ts`, `render.test.ts`; e2e counts 40 |
| The standard Cambodian sheet: a titled page, every detail a "label : value" row | `render.test.ts`, `docx.test.ts`; e2e checks the rows on screen |
| Personal details are optional, asked once, printed by every template, and left out when empty or hidden | `questionnaire.test.ts`, `render.test.ts`, `docx.test.ts`; e2e fills them in English and skips them in Khmer |
| Changing template keeps content | e2e |
| Saved CV survives restart; edits autosave | e2e reload; `storage.test.ts` |
| PDF prints only the CV | e2e: print media, PDF generated |
| Word export is an editable document | `docx.test.ts`; e2e download |
| Khmer CV renders with Khmer labels, dates and fonts | e2e; `render.test.ts`; `docx.test.ts` |
| Works with no internet after one visit | e2e: product page, dashboard, questions and editor offline |
| AI off → no AI controls, no cross-origin requests | e2e; `orchestrator.test.ts` |
| Cloud AI → only the chosen field is sent, after consent | e2e: exact request body, no cookie or referrer; `test_api.py` |
| AI never changes text without the person accepting | e2e: suggestion, integrity warning, keep mine, accept, restore |
| The person can duplicate or delete one CV, or delete everything | e2e (My CVs); `storage.test.ts` |
| Fits a phone with no horizontal scroll | e2e at 390×844 |
