# Live admin UI/UX QA — scoped fixes verified, parity incomplete

## Provenance and safety

- Target: https://admin.leapeng.uz; fresh authenticated audit, not an old local fixture mistaken for production.
- Initial live pass started from frontend `release/admin-readonly` at `7bb9aa6` and backend at `1eccb1a`. The resumed pass preserved and verified the uncommitted fixes; backend remains unchanged.
- All 9 observed live script filenames exist in the preserved baseline `.next` build. This is build-asset corroboration, **not proof of the deployed Git SHA**.
- Reference: existing native `work/pencil/full/*.png`, `nodes.json`, `inventory.json`. No .pen read, edit or save. The existing export was used; no claim of a newly refreshed live Pen canvas.
- Production interaction was read-only after authorized login: navigate, open/close dialogs, inspect selectors, exact empty-result search and clear. No note/grant/payment/import/publication/reconciliation/message mutation, commit, push or deployment.
- Screenshots remain local under ignored `work/live-qa`; they contain authorized operational data and must not be published as public fixtures. No passwords, tokens, cookies, private payload dumps or vault contents were captured.

## Verified fixes

|ID|Severity|Observed problem / root cause|Local correction and evidence|
|---|---|---|---|
|LQ-01|Medium|Learner directory rows overflowed by 24px (369px content inside 345px list at live desktop). Archived content-box row plus new width:100% counted horizontal padding twice.|Scoped `.readonly-person` border-box sizing. RED: 384 > 360 in real archived-markup fixture; GREEN desktop/mobile light/dark plus authenticated runtime.|
|LQ-02|Medium|Previous/Next labels clipped: live notification button width 30px with scroll width 67px. Text controls inherited the original 30px numbered-page CSS; parent shrink-wrapped.|Scoped full-width wrapping pagers and intrinsic text-button width/height, retaining original numbered control styling elsewhere. RED: Previous label overflow; GREEN authenticated desktop/mobile content, learners and messages.|
|LQ-03|High|Mobile Content showed only catalog; CSS hides Lesson Editor Panel unless mobile-detail, but selecting a real lesson changed only lessonId. Editor navigation was unreachable.|Selection now enters existing mobile detail state and scrolls to editor; Back returns to correct route list. Real disposable lesson click failed hidden before fix and passed after isolated rebuild. `local-runtime/content-editor-mobile.png`.|

## Fresh route evidence

Desktop 1440x1000; mobile 430x900. Full-length captures include below-fold content. Mobile navigation separately measured at 430x700. Native main reference boards are 1440px wide; browser scrollbar reduces live content width by 15px, which is documented rather than misreported as pixel identity.

|Route|Live desktop|Live mobile|Current findings / remaining gap|
|---|---|---|---|
|`#overview`|[capture](../work/live-qa/overview-desktop-full.png)|[capture](../work/live-qa/overview-mobile-full.png)|Real analytics and learner reads exist. Delivery health, attention, progress/activity allocations retain unavailable values; cross-entity search remains limited.|
|`#learners`|[capture](../work/live-qa/learners-desktop-full.png)|[capture](../work/live-qa/learners-mobile-full.png)|Real directory/profile/access/notes present. Row and pager defects fixed locally. Filter tabs and attention/detail composition still differ from Pen.|
|`#content`|[capture](../work/live-qa/content-desktop-full.png)|[capture](../work/live-qa/content-mobile-full.png)|Catalog, authoring, import and preview are connected now (old not-implemented table is stale). Catalog replaced the Pen hierarchical composition with a select/flat list; raw preview differs. Mobile editor entry fixed locally.|
|`#commerce`|[capture](../work/live-qa/commerce-desktop-full.png)|[capture](../work/live-qa/commerce-mobile-full.png)|Analytics and Transactions connected; actual live orders empty. Reconciliation dialog exists; payment details cannot be certified with absent orders. Finance breakdowns retain unavailable slots.|
|`#learning`|[capture](../work/live-qa/learning-desktop-full.png)|[capture](../work/live-qa/learning-mobile-full.png)|Actual funnel and daily activity exist. Course/retention/attention panels retain unavailable slots; queue is a long scrollable dialog rather than full Pen intervention flow.|
|`#messages`|[capture](../work/live-qa/messages-desktop-full.png)|[capture](../work/live-qa/messages-mobile-full.png)|Actual inbox read exists but live dataset is empty. Disabled category/search controls, plain empty composition and placeholder detail rail remain; text pager fixed locally.|

## Board and state matrix

Programmatically reconciled **15 boards and 36 distinct cards**. Every item is listed; unexercised is not silently marked passed. [Machine-readable matrix](live-qa-matrix.json).

|Board ID|Board|This pass|
|---|---|---|
|bi8Au|Light / Admin Overview|observed_partial|
|O3oJS8|Light components / Admin Navigation|inventory_mapped_not_full_parity|
|uYGzD|Light / Admin Commerce Payments|observed_partial|
|C5tZxu|Light / Admin Learners|observed_partial|
|DUfwI|Light / Admin Content Studio|observed_partial|
|KNuM1|Light / Admin Learning Analytics|observed_partial|
|nqETx|Light / Admin Message Events|observed_partial|
|dJbzn|Light states / Admin Shared Data States|inventory_mapped_not_full_parity|
|p2ZCOJ|Reference / Admin Payment Responsive Contract|inventory_mapped_not_full_parity|
|NuLlW|Light states / Admin Commerce Transactions and Reconciliation|inventory_mapped_not_full_parity|
|IhJxo|Light states / Admin Mobile Navigation|verified_read_navigation_geometry|
|r2iEu|Shared / Search, settings & data states|inventory_mapped_not_full_parity|
|CTwDe|Operations / Learners, access & payments|inventory_mapped_not_full_parity|
|akMjF|Content / Authoring, preview & publication|inventory_mapped_not_full_parity|
|zSgOv|Interactions / Navigation, filters & edge cases|inventory_mapped_not_full_parity|

|Board/card|State|Status|Fresh observation|
|---|---|---|---|
|r2iEu/cCm6d|Search LEAP|partial|Dialog exists; exact username only, not cross-entity/name search.|
|r2iEu/KC4fd|Date range|opened_only|Real date fields and Apply range present; no range application tested live.|
|r2iEu/iFMMl|Workspace settings|opened_only|445.33 x 530 dialog; settings not saved during read-only audit.|
|r2iEu/ERhpY|Admin profile|opened_only|Real authenticated profile; Sign out not invoked.|
|r2iEu/X7RGZw|Learner record|opened_only|Identity, access/activity and notes disclosures exist; not full reference layout parity.|
|r2iEu/GOQza|Export report|opened_only|Download CSV available, not invoked or counted as verified export.|
|r2iEu/pXSYY|No results|verified_read|Exact nonmatching query showed true empty state; Clear filters restored rows.|
|r2iEu/fDcnE|Refresh failed|not_exercised|No artificial production network outage injected.|
|r2iEu/Unnt5|Data is updating|not_exercised|Transient state not captured with a deliberately delayed production request.|
|CTwDe/EAM4b|Add internal note|opened_only|Real note dialog and validation; no production note saved.|
|CTwDe/T5Fucu|Manage access|opened_only|Business-state GET succeeded; existing policy is implemented, not an unresolved old assumption. No grant submitted.|
|CTwDe/IezlC|Confirm access change|not_exercised|Write-adjacent confirmation intentionally not driven.|
|CTwDe/c9Xpu|Changes saved|not_exercised|No business writes; no fabricated successful mutation.|
|CTwDe/T0lSS5|Record changed|not_exercised|No forced production concurrency conflict.|
|CTwDe/m52teT|Payment details|data_unavailable|Transactions read succeeded; no production orders available for detail selection.|
|CTwDe/PAWip|Reconciliation case|opened_only|Reconcile case opens via Reconciliation Commerce Tab. GET cases and permissions succeeded.|
|CTwDe/j99esh|Resolve discrepancy|not_exercised|No case closure or entitlement change submitted.|
|CTwDe/MxdBA|Learning intervention|partial|Actual unfinished activity queue opens; internal follow-up write form not submitted.|
|akMjF/Ru7xA|Create lesson|opened_only|Create draft fields exist; no production lesson created.|
|akMjF/fIcXc|Video block|disabled_for_selection|Video editor disabled for the selected production lesson; no forced enable.|
|akMjF/dEL0Q|Key phrases|opened_only|Editor opens; published lesson prevents in-place write.|
|akMjF/V5ORPR|Quick check|opened_only|Editor opens; 548px content scrolls inside 530px card, unlike short reference composition.|
|akMjF/qRjYx|Lesson navigation|opened_only|Dialog opens; no reorder or position write.|
|akMjF/eQe4b|Lesson preview|partial|Persisted data preview opens; raw JSON presentation differs from learner-like Pen preview.|
|akMjF/Of8An|Ready to publish|disabled_for_selection|Published selection cannot publish again; readiness not exercised on a production draft.|
|akMjF/ajCY8|Publication blocked|not_exercised|No eligible production draft selected to assert validator outcome.|
|akMjF/VFPXb|Import content|opened_only|Manifest picker exists; no file upload, review POST, or import run.|
|zSgOv/xRdGA|Sign in|verified_read|Vault-filled real authentication succeeded. No password/session material captured.|
|zSgOv/AHGaK|Notification detail|data_unavailable|Live inbox is empty; not possible to select a real notification.|
|zSgOv/lMAYu|Cohort filter|opened_only|Cohort dialog opens; available choices read, no changed query applied.|
|zSgOv/WT1RJ|Chart drilldown|not_exercised|Daily chart present; no separate chart-click drilldown exercised.|
|zSgOv/sOXyE|Sort & paginate|partial|Sort dialog opens; local production fixture verifies bounded pagers and corrected label geometry.|
|zSgOv/SEuvI|Unsaved changes|not_exercised|No draft edits made in production.|
|zSgOv/JNgMj|Reorder lesson blocks|opened_only|Reorder dialog opens; no Move up or Save order invoked.|
|zSgOv/ZXMLy|Payment filters|opened_only|Real status/method selectors open; no provider actions.|
|zSgOv/tdZIt|Required field|partial|Empty note and lesson-create primary buttons disabled; no invalid production submits.|

## Execution and evidence boundaries

- Captured 12 live route/viewport pairs and corresponding full-page images. `routes.json` contains URL, dimensions, request paths/statuses and overflow diagnostics; no response bodies.
- `dialogs.json`: 24 attempts, 20 rendered dialogs; disabled and missing triggers preserved as observations. The initially missing reconciliation trigger was resolved through the real Commerce tab, separately in `interactions.json`.
- All retained observed admin resource statuses were 200; browser `error`/`unhandledrejection` listeners saw no errors during the dialog pass. This is not historical-console coverage before instrumentation.
- Mobile navigation opened at x=0, y=0, width=430, height=700; choosing Messages changed hash and closed drawer. Exact nonmatching learner query showed No results, then Clear restored nine live rows.
- `node tests/live-layout.mjs`: PASS in desktop/mobile and light/dark isolated presentation fixtures. This is scoped geometry, not whole-page visual parity.
- `node tests/live-layout-run.mjs`: PASS. Builds isolated current source, runs production Next 3107 through local HTTPS 3447 to real FastAPI 8127 with disposable SQLite and real secure login. Tests every route at desktop/mobile, no document/row/pager horizontal overflow, mobile lesson editor entry/return, zero page errors. Screenshots and parsed results: `work/live-qa/local-runtime/`. Fresh rerun logs: `work/live-qa/resume-runtime.log`, `resume-tests.log`, `resume-lint.log`, `resume-layout.log`.
- `npm test`: 28 passed, 0 failed, 0 skipped. `npm run lint`: passed. Isolated optimized build and TypeScript passed; only nested-lockfile workspace-root warning.
- Original running preview and baseline .next were preserved; only owned disposable test servers were stopped. Local fixture is not production data or PostgreSQL concurrency verification.

## Remaining acceptance work

This is **not full UI/UX parity or full workflow certification**. The full matrix explicitly withholds saves, conflicts, publication, notification/payment detail with absent live data, failure/loading injection and several read-only filter/drilldown transitions. Major composition gaps (content hierarchy/preview, unavailable finance/learning/detail allocations, disabled filters) remain; do not deploy on a claim that every Pen state was fixed.

Old `admin-acceptance-matrix.*` was intentionally not rewritten: it describes a historical implementation stage. This report and the fresh matrix distinguish now-connected live capabilities from the older unsupported-shell assumptions.


## Resume verification and before/after evidence

Recovered the interrupted authenticated live evidence rather than claiming a second production session. All local checks were rerun after the final edit. Four scoped defects are corrected locally: LQ-01/LQ-02 above (Medium), LQ-03 above (High), and LQ-04 below (High). This is not a count of every remaining design discrepancy.

Updated review preview: https://localhost:3447 (self-signed local TLS, disposable data only), background process proc_78ffdf2138ce handed to parent. Preview log confirms the authenticated route suite passed before PREVIEW READY; separate GET /login returned 200. Do not use production credentials on this fixture. Existing unrelated preview was not restarted.

### LQ-04 — mobile publish-readiness panel outside the visible workspace
- Reproduce on the initial local fix: at 430px open Content and select a lesson. Expected: editor and readiness stack inside the workspace. Actual: inherited column flex-wrap placed readiness at x=414..792; a horizontal-only correction then left its bottom at 1070 beyond parent bottom 648. Overflow-hidden made the document-width test falsely pass.
- Root cause: archived flex:1 1 0 allocation plus responsive column wrapping. Scoped mobile-detail override uses flex:none and flex-wrap:nowrap; the regression now checks each panel against viewport horizontal bounds and parent vertical bounds, before returning to catalog.
- RED logs: `work/live-qa/resume-mobile-red.log` and `resume-mobile-vertical-red.log`. Final GREEN: `resume-runtime.log`. Geometry: `local-runtime/content-mobile-panels-before.json` and `content-mobile-panels.json`.

|Evidence|Before|After|
|---|---|---|
|Learner rows / pager (different datasets; geometry comparison only)|[Authenticated live](../work/live-qa/learners-desktop-full.png)|[Real local API fixture](../work/live-qa/local-runtime/learners-1440.png)|
|Notification pager (live empty vs local populated)|[Authenticated live](../work/live-qa/messages-desktop-full.png)|[Real local API fixture](../work/live-qa/local-runtime/messages-1440.png)|
|Mobile content entry|[Authenticated live catalog](../work/live-qa/content-mobile-full.png)|[Local editor and readiness](../work/live-qa/local-runtime/content-editor-mobile.png)|
|Mobile readiness clipping (same local fixture)|[Before wrap fix](../work/live-qa/local-runtime/content-editor-mobile-before-wrap-fix.png)|[Final](../work/live-qa/local-runtime/content-editor-mobile.png)|

Additional visual limitations remain: long operational footer and fixed Back control do not match the compact reference composition; missing-value glyphs and disabled chips still occupy many data slots. Per-element clipping outside the specifically asserted panels/rows/pagers is not certified. No whole-page pixel-diff, complete accessibility audit, PostgreSQL race suite, or mutation workflow suite was run in this resumed pass.
