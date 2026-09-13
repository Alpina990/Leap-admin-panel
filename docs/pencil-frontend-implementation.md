# Pencil frontend implementation follow-up

> Subsequent real payment/note integration: [admin-operations-implementation.md](admin-operations-implementation.md). Complete board/card delivery status: [admin-acceptance-matrix.md](admin-acceptance-matrix.md). The read-only limitations below describe the prior increment.

This is implementation, not a replacement audit. `pencil-full-audit.md` remains the source reference inventory; its old runtime findings predate this patch. **Complete 1:1 parity is not claimed and deployment is not approved.**

## Implemented

- `app/pencil-navigation.tsx`: one canonical component for all six routes. Chosen reference is **O3oJS8**, not the Overview-specific nav, because the reusable component explicitly includes appearance. At 1440px, its outer bounds are 1400×72, primary nav is 507×54 at x422 (20px board inset +402), and appearance stays available. Saved light/dark preference remains intact.
- Full-width 430px mobile navigation follows IhJxo: brand/close header, Operations/account, all six route items, CURRENT badge, utility bar and responsive-contract allocation. Counts are not invented. Actual route selection and Escape work.
- Shared dialogs use the actual Pen card geometry: 445.33×530, 22px padding, 20px corner radius, 14px spacing, inset fields and bottom 40px actions. Settings supports transactional Cancel/Save for device preferences and real GET-only refresh every 60 seconds while visible. Admin profile uses the authenticated username/session. Learner record shows real identity, honest unavailable access/activity, expandable API identity facts and the access workflow preview.
- Global Search LEAP opens a dialog without changing route. Only exact, case-sensitive learner username lookup is supported by the real API; orders/messages and partial/name search are explicitly unavailable. Real result → learner directory handoff, empty, loading, error and retry are implemented. Changing the input removes old results and disables Open learner.
- Sign in follows the Pen interaction-card layout with real username/password form, native constraints, error feedback, Cancel/reset and bottom actions. Existing Origin/CSRF/cookie protections are unchanged.
- Query-scoped refresh state preserves previously loaded observations on transient refresh failure, with observed last-success timestamp and Retry. Changed query/path does not reuse another identity. Initial loads render skeleton rows; empty results show filter context and Clear filters. A 401 clears this hook's observations and redirects to secure login.
- Twenty safe state-card definitions retain only approved static descriptions/field labels/action captions from the exported Pen nodes, not sample values. Route entry points open date/export/access/note/payment/content/cohort/intervention/sort previews. Their business submit buttons remain disabled with a visible explanation; success/conflict/resolution/publication outcomes are not fabricated. Sixteen distinct entry paths are browser-exercised. Some definitions (chart drilldown, notification detail, reorder) remain unbound because there is no real selectable record/observation/editor.
- Light-mode label colors on dark/violet allocations now use observed #DDD8F1, positive-label #CBF5E9, lavender #EEEAFA and white filter toolbars. Existing solid #6655BB panel correction is retained. Dark mode is not repainted.

## Verification

- `npm test`: 18 passed; `npm run lint`: passed.
- Isolated production Next build: compiled and TypeScript passed; only the existing nested-lockfile root warning.
- `node work/pencil-isolated-run.mjs`: real FastAPI disposable DB on8124 → Next3101 → HTTPS3444. Six routes, Search, profile/settings/record, mobile, network failure/recovery, persisted theme, preference cancel/save/reload, real automatic refresh, delayed real-response skeletons, identity clearing and 16 safe workflow entries exercised. No API response substitutions; the loading test briefly delays then continues the actual request. No business writes observed; no browser JavaScript errors.
- Evidence: `work/pencil/frontend-verification.log`, `work/pencil/updated-runtime/verification.json`, `frontend-regression.json`, and PNGs in that directory. Reusable browser regression: `tests/pencil-frontend.mjs`, invoked by `work/pencil-audit.mjs`.
- Inspected actual screenshots, not only CSS: canonical Overview, full-width mobile, settings, sign-in, global search and Create lesson preview. Screenshots are authenticated disposable real-API fixtures, NOT production data.
- Initial runtime caught accidental matching of Commerce Local Navigation; narrowed replacement to Admin Navigation. Initial screenshot caught missing outer width and an in-flight Sheet animation; fixed width and assert settled x/width before capture. A loading-test unroute race was corrected by awaiting request continuation. No production security weakening.

## Remaining approval/backend-dependent gaps

- No API for payment orders/details/transactions/reconciliation, entitlements/access changes, internal notes, learner progress/presence, analytics/cohorts/chart observations, message events/delivery or content catalog/editor/import/publication. Therefore samples, traces, totals, statuses, chart marks and successful writes cannot match the design without new approved contracts.
- Payment master/detail still represents learner identities with payment slots unavailable, not a payment DTO. Desktop/mobile payment workflow, notification selection and editable content/reorder/unsaved-change flows cannot be certified as working parity.
- Date/cohort/payment filters, arbitrary directory sorting and CSV export are honest previews, not applied operations. Learner filtering remains exact username, fixed Telegram-ID API order and 25-row pages. Local page-only sorting was intentionally not presented as global sorting.
- Read-only explanations, API pagination, unavailable copy, secure-session footer and expandable identity facts are deliberate integration differences from sample boards. User visual approval and agreement on those exceptions remain required.
- No commit, push or deployment. The user's existing 8123/3100/3443 preview was not rebuilt or restarted; it still serves the old build. Only isolated verification processes were owned and stopped.
