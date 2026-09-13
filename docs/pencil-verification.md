# Current Pencil follow-up

**Superseded reference coverage:** [Full live-canvas parity audit](pencil-full-audit.md) exports all 15 boards via the running Pen MCP integration, measures actual Pen properties and identifies remaining UI/UX gaps. Exact parity is not achieved. The records below remain historical evidence, not the current access limitation.

Inspected the existing restoration diff before editing. Kept its six source-tree renderers, data adapter, safe static-copy audit, layout constraints and security tests intact.

## Actual design evidence

Captured the running Pen.exe window, document `leap-admin-light-complete.pen` (already marked Edited), at its displayed 38% zoom:

- `C:/Users/user/AppData/Local/hermes/cache/images/computer_use_2153041784cc4d759f343234a0f5a998.png`
- `C:/Users/user/AppData/Local/hermes/cache/images/computer_use_733e465b89cf4526b1fdb1caf299cba4.png`

Visible commerce board: light lavender page, dark revenue/chart card, two white analysis panels, dark learner/payment master table, violet right detail. Visible learner directory: white summary cards and dark master-detail workspace. Partial overview: white cards and violet learner detail. These structures and palette are retained in the restored frontend. The right-hand reconciliation state board is additional design content, not a supported API-backed route; its operations remain disabled rather than fabricated.

No ordinary file reader was used on the .pen document. No design edits or save commands were issued. A view-only horizontal scroll required the tool's foreground escalation after background delivery was refused. No reliable enlarged/full-board reference was obtained, so this is visual structural comparison, not pixel parity with Pencil.

## Scoped implementation

- `app/theme-provider.tsx`: fresh workspaces now default to light, matching the open design, instead of dark. Existing saved `leap-theme` preferences and both theme controls remain supported.
- `tests/runtime.test.mjs`: regression for light default and retained preference storage. Observed failing test before changing production code.
- `tests/production-smoke.mjs`: asserts fresh browser light mode; toggles to dark and reloads to prove saved preference; captures and compares all six light desktop routes in addition to the previous dark and mobile checks.

No backend, authentication/session, BFF, archive, or presentation-tree rewrites in this follow-up. No commit, push or deployment.

## Fresh execution

Executed successfully as one foreground command:

```
npm test && npm run lint && npm run build && node tests/production-smoke.mjs '../LeapEnglish/apps/api'
```

- Unit tests: 12 passed, 0 failed.
- ESLint: passed.
- Production Next build: passed (compiled 6.1s, TypeScript 17.2s).
- Real HTTPS Edge → production Next → actual FastAPI → disposable SQLite smoke: passed.
- Fresh light default and persisted dark reload: passed.
- Existing security, real counts, exact filtering, string IDs, 25+2 pagination, selection, empty/error/retry, mobile overflow, logout/revocation and zero browser JS error assertions: passed.
- Programmatic aggregation: 12 geometry files, 34 measured card/workspace allocations, maximum delta 0 px against the immutable source-tree fixture. These are NOT Pencil pixel measurements.
- 33 screenshot files in `work/smoke/` after this run.
- Independent TCP checks after cleanup: 8123, 3100 and 3443 all refused connections (Windows 10061).

## Visual review / limits

Manually inspected `work/smoke/overview-light-desktop.png`, `learners-light-desktop.png`, and `commerce-light-desktop.png` against the visible Pencil portions. The dark/light surfaces, original card hierarchy, commerce two-panel analysis row and violet details remain. Test records come from the disposable backend database; no production learner data or application demo fallback is used.

Unsupported numbers, payment labels, health statuses and charts are deliberately unavailable. Extra exact-filter/pager controls and read-only footer are integration differences. Existing source geometry checks exclude dynamic replacement slots. Only part of the open design was legible at 38%; no assertion of exact colors sampled from Pencil, exact typography measurements, additional state-board implementation or whole-page pixel identity is made. User approval is still required before any push/deployment.
