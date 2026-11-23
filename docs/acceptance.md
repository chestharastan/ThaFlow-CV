# Release acceptance criteria

Each row is checked by an automated test. `e2e` is `apps/web/e2e/smoke.mjs`.

| Criterion | Where it is checked |
| --- | --- |
| Create CV works without AI | e2e: guided questionnaire + rule-based quick add |
| Saved CV survives restart | e2e: reload; `storage.test.ts`: reopen database |
| Edits are autosaved | e2e: save indicator, reload |
| Changing template keeps content | e2e: template switch |
| PDF text and layout | e2e: print media shows only the CV, PDF generated (visual check still manual) |
| DOCX stays editable | `docx.test.ts`: text present as runs; e2e: download |
| Khmer characters render | e2e: Khmer labels/dates, Khmer webfont loaded; `docx.test.ts`: Khmer complex-script font |
| Works with no internet | e2e: offline reload, open and edit |
| Local AI unavailable → manual workflow works | e2e runs entirely without a local model |
| Cloud AI disabled → no cloud requests | e2e: zero cross-origin requests; `orchestrator.test.ts` |
| Cloud AI enabled → only authorized content sent | e2e: exact request body, no cookie/referrer; `test_api.py`: unknown fields rejected |
| User can clear local data | e2e: delete everything; `storage.test.ts` |
