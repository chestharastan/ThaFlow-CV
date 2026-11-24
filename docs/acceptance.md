# Acceptance checks

Each row is checked by an automated test. `e2e` is `apps/web/e2e/smoke.mjs`, run against the production build.

| Promise | Where it is checked |
| --- | --- |
| A new person can create a CV with no AI | e2e: landing → questions → templates → finished CV |
| Every question is a URL; Back and reload lose nothing | e2e; `questionnaire.test.ts` (branching, next/previous) |
| "Not yet" worked → projects are asked | e2e (phone run); `questionnaire.test.ts` |
| An existing CV is read on the device | e2e: Word and PDF exported by the app are imported and pre-fill the answers, with zero network requests; `import.test.ts` |
| A CV from another tool is read in the right order | `foreign.test.ts`: eight layouts (sidebars, narrow gutter, table, dates in a margin) all yield the same person, jobs, school, projects and skills; e2e imports one; `layout.test.ts` |
| A photo, a scan or a Khmer PDF is read on the device | e2e with `THAFLOW_OCR_MODELS` set: a tilted phone photo, a scanned PDF and a Khmer PDF are imported; only the three model files are fetched, once; `ocr.test.ts` |
| What was read from an existing CV is shown in full before it is used | e2e: every section's details are listed on "Here is what we found", and Continue stays in reach however long the list |
| Files that are not a CV are refused with a reason | e2e; `import.test.ts` |
| 30 distinct templates, all render in English and Khmer | `registry.test.ts`, `render.test.ts`; e2e counts 30 |
| Changing template keeps content | e2e |
| Saved CV survives restart; edits autosave | e2e reload; `storage.test.ts` |
| The CV is always shown on A4 sheets; a longer CV gets another sheet | e2e: every sheet measures 210:297, a long summary adds a second sheet with the rest of it, and the screen has as many sheets as the PDF has pages; `render.test.ts` (pages on screen); the template gallery script compares sheets with printed pages for every template |
| PDF prints only the CV | e2e: print media, PDF generated |
| Word export is an editable document | `docx.test.ts`; e2e download |
| Khmer CV renders with Khmer labels, dates and fonts | e2e; `render.test.ts`; `docx.test.ts` |
| Works with no internet after one visit | e2e: landing, questions and editor offline |
| AI off → no AI controls, no cross-origin requests | e2e; `orchestrator.test.ts` |
| Cloud AI → only the chosen field is sent, after consent | e2e: exact request body, no cookie or referrer; `test_api.py` |
| AI never changes text without the person accepting | e2e: suggestion, integrity warning, keep mine, accept, restore |
| The person can delete one CV or everything | e2e; `storage.test.ts` |
| Fits a phone with no horizontal scroll | e2e at 390×844 |
