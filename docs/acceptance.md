# Acceptance checks

Each row is checked by an automated test. `e2e` is `apps/web/e2e/smoke.mjs`, run against the production build.

| Promise | Where it is checked |
| --- | --- |
| A new person can create a CV with no AI | e2e: landing → questions → templates → finished CV |
| Every question is a URL; Back and reload lose nothing | e2e; `questionnaire.test.ts` (branching, next/previous) |
| "Not yet" worked → projects are asked | e2e (phone run); `questionnaire.test.ts` |
| An existing CV is read on the device | e2e: Word and PDF exported by the app are imported and pre-fill the answers, with zero network requests; `import.test.ts` |
| Files that are not a CV are refused with a reason | e2e; `import.test.ts` |
| 30 distinct templates, all render in English and Khmer | `registry.test.ts`, `render.test.ts`; e2e counts 30 |
| Changing template keeps content | e2e |
| Saved CV survives restart; edits autosave | e2e reload; `storage.test.ts` |
| PDF prints only the CV | e2e: print media, PDF generated |
| Word export is an editable document | `docx.test.ts`; e2e download |
| Khmer CV renders with Khmer labels, dates and fonts | e2e; `render.test.ts`; `docx.test.ts` |
| Works with no internet after one visit | e2e: landing, questions and editor offline |
| AI off → no AI controls, no cross-origin requests | e2e; `orchestrator.test.ts` |
| Cloud AI → only the chosen field is sent, after consent | e2e: exact request body, no cookie or referrer; `test_api.py` |
| AI never changes text without the person accepting | e2e: suggestion, integrity warning, keep mine, accept, restore |
| The person can delete one CV or everything | e2e; `storage.test.ts` |
| Fits a phone with no horizontal scroll | e2e at 390×844 |
