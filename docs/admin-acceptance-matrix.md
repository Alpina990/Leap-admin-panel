# Admin acceptance matrix — delivery is incomplete

Enumerates every exported board and state card; a disabled preview is not an implemented workflow. Status **verified** applies only to the described behavior, not full pixel parity. Reference: exported live Pen snapshot `work/pencil/nodes.json`. Fresh MCP recheck failed (desktop bridge disconnected); no .pen filesystem inspection or mutation.

## Boards

|ID|Board|Status|Acceptance / gap|
|---|---|---|---|
|bi8Au|Light / Admin Overview|partial|Original structure/navigation/counts; no fabricated activity/charts.|
|O3oJS8|Light components / Admin Navigation|verified|Canonical reusable navigation geometry and themes.|
|uYGzD|Light / Admin Commerce Payments|partial|Real Transactions/payment details and filters; finance aggregates and all-learner access summaries unfinished.|
|C5tZxu|Light / Admin Learners|partial|Directory/profile plus private notes; learning and access summaries unfinished.|
|DUfwI|Light / Admin Content Studio|not_implemented|Preserved shell; actual content editor/catalog integration not delivered.|
|KNuM1|Light / Admin Learning Analytics|not_implemented|Preserved shell; analytics and intervention implementation remains.|
|nqETx|Light / Admin Message Events|not_implemented|Preserved shell; notification/event integration remains.|
|dJbzn|Light states / Admin Shared Data States|verified|Real loading, empty, stale/error/retry states in supported data views.|
|p2ZCOJ|Reference / Admin Payment Responsive Contract|partial|Payment detail mobile entry/return preserves filters/page; no complete financial responsive parity claim.|
|NuLlW|Light states / Admin Commerce Transactions and Reconciliation|partial|Real one-order-per-row ledger; exception reconciliation queue remains.|
|IhJxo|Light states / Admin Mobile Navigation|verified|Full-width mobile navigation and route selection.|
|r2iEu|Shared / Search, settings & data states|partial|See individual shared-state rows.|
|CTwDe|Operations / Learners, access & payments|partial|See individual operations-state rows.|
|akMjF|Content / Authoring, preview & publication|not_implemented|All nine content workflows remain implementation work.|
|zSgOv|Interactions / Navigation, filters & edge cases|partial|See individual edge-state rows.|

## State cards

|Board / card ID|State|Status|Acceptance / gap|Evidence|
|---|---|---|---|---|
|r2iEu / cCm6d|Search LEAP|partial|Exact learner username lookup is real; cross-entity/name search is not implemented.|tests/pencil-frontend.mjs|
|r2iEu / KC4fd|Date range|not_implemented|Preview only; no server date-range summary/query contract.|docs/pencil-frontend-implementation.md|
|r2iEu / iFMMl|Workspace settings|verified|Theme and automatic-refresh cancel/save/persistence.|tests/pencil-frontend.mjs|
|r2iEu / ERhpY|Admin profile|verified|Authenticated account and actual logout.|work/pencil-audit.mjs|
|r2iEu / X7RGZw|Learner record|partial|Identity and paginated private note history work; access/progress/streak missing.|tests/operations-browser.mjs|
|r2iEu / GOQza|Export report|not_implemented|CSV export not implemented; no export is fabricated.|docs/pencil-frontend-implementation.md|
|r2iEu / pXSYY|No results|verified|Real learner/payment empty results and clear/filter recovery.|tests/operations-browser.mjs; tests/pencil-frontend.mjs|
|r2iEu / fDcnE|Refresh failed|verified|Real network loss, retained same-query observations, Retry.|work/pencil-audit.mjs|
|r2iEu / Unnt5|Data is updating|verified|Real response delayed then continued; no injected API body.|tests/pencil-frontend.mjs|
|CTwDe / EAM4b|Add internal note|verified|Private append-only audited save, idempotent retry, permission/CSRF/validation; readback.|tests/operations-browser.mjs; backend tests/test_admin_operations.py; test_admin_postgres.py|
|CTwDe / T5Fucu|Manage access|business_decision|Whole-catalog lifetime product versus existing per-section entitlements: scope must be settled; no paid grants overwritten.|backend DESIGN.md:47-68; services/entitlements.py:120-146|
|CTwDe / IezlC|Confirm access change|business_decision|No access mutation while catalog scope and paid-entitlement precedence remain unresolved.|backend DESIGN.md:47-68|
|CTwDe / c9Xpu|Changes saved|partial|Actual note save success and audit, not access/content success.|tests/operations-browser.mjs|
|CTwDe / T0lSS5|Record changed|partial|API 409 for conflicting idempotency keys; full correction version-conflict UI absent.|backend tests/test_admin_operations.py|
|CTwDe / m52teT|Payment details|verified|Real order identifiers, exact tiyin amount, persisted timestamps and source=wlcm/payment_id entitlement association; desktop/mobile.|tests/operations-browser.mjs|
|CTwDe / PAWip|Reconciliation case|not_implemented|Exception queue and case persistence are not implemented. Read payment/entitlement detail is available.|backend models.py:426-497|
|CTwDe / j99esh|Resolve discrepancy|business_decision|Design has mark resolved; ledger forbids manual settle/refund. Need define case-only resolution versus entitlement repair.|backend docs/DESIGN_IMPLEMENTATION_STATUS.md:24; services/payments.py:128-199|
|CTwDe / MxdBA|Learning intervention|business_decision|No intervention model. Define note-only versus progress/access correction or outbound contact.|backend models.py; docs/decisions/002-admin-panel-architecture.md:83-84|
|akMjF / Ru7xA|Create lesson|not_implemented|Lesson/Unit models exist. Audited admin creation and editor integration remain actual implementation work, not absent models.|backend models.py:110-199|
|akMjF / fIcXc|Video block|not_implemented|ContentBlock/MediaAsset exist; admin editor and validation not implemented.|backend models.py:178-234|
|akMjF / dEL0Q|Key phrases|not_implemented|Content payload editing not implemented; do not invent successful save.|backend manifest.py; models.py|
|akMjF / V5ORPR|Quick check|not_implemented|Assessment models/services exist; authoring DTO/editor not implemented.|backend api/routes/assessments.py|
|akMjF / qRjYx|Lesson navigation|not_implemented|Existing position/prerequisite semantics need admin editor binding.|backend services/lesson_access.py|
|akMjF / eQe4b|Lesson preview|not_implemented|Admin preview not implemented; learner routes remain entitlement-protected.|backend api/routes/content.py|
|akMjF / Of8An|Ready to publish|not_implemented|Audited publication validation and transaction not implemented.|backend models.py:146-199|
|akMjF / ajCY8|Publication blocked|not_implemented|No real publication validator outcome in admin; unavailable is not a validation result.|backend manifest.py|
|akMjF / VFPXb|Import content|not_implemented|Manifest importer exists but no bounded audited admin import/diff transaction; importer must not overwrite edits automatically.|backend services/content_import.py; ADR-002:56-59|
|zSgOv / xRdGA|Sign in|verified|Real secure account authentication, form validation and errors.|tests/production-smoke.mjs; work/pencil-audit.mjs|
|zSgOv / AHGaK|Notification detail|not_implemented|LearnerNotification exists; admin event read DTO/view missing. Telegram delivery evidence is a different model.|backend models.py:396-423|
|zSgOv / lMAYu|Cohort filter|not_implemented|No agreed cohort classification/admin aggregate query implemented.|backend models.py:500-529|
|zSgOv / WT1RJ|Chart drilldown|not_implemented|No admin analytics aggregate/drilldown query implemented.|docs/pencil-frontend-implementation.md|
|zSgOv / sOXyE|Sort & paginate|partial|Server-bounded fixed-order learner/order/note pagination works; design arbitrary sorting not implemented.|tests/operations-browser.mjs; backend admin.py|
|zSgOv / SEuvI|Unsaved changes|partial|Note draft discard confirmation implemented; not yet browser-exercised; content-editor state absent.|app/note-dialog.tsx|
|zSgOv / JNgMj|Reorder lesson blocks|not_implemented|Position constraints exist; transactional reorder/editor not implemented.|backend models.py:178-192|
|zSgOv / ZXMLy|Payment filters|verified|Server status/method filters, reset pagination, active labels and rapid reopen; no provider calls.|tests/operations-browser.mjs|
|zSgOv / tdZIt|Required field|partial|Note and login constraints work; content-required-field state absent.|backend tests/test_admin_operations.py; app/note-dialog.tsx|

Counts were parsed/deduplicated in Python against the source manifest: 15 boards, 36 unique cards. This is inventory completeness, not completion. The JSON counterpart is machine-readable. No commit, push or deployment is approved.
