# Real payment + private note integration — incomplete overall delivery

This is a working backend/frontend increment, not a claim that the whole Pencil admin task is finished. [The acceptance matrix](admin-acceptance-matrix.md) enumerates all 15 exported boards and 36 unique state cards, including actual unfinished work and genuine product decisions. Disabled previews do not count as complete.

## Delivered

- Commerce Transactions uses actual `PaymentOrder` records instead of learner identities. Server status/method filters, bounded offset pagination, active tab/filter labels, exact tiyin formatting, one-order-per-row selection, private order IDs and persisted timeline/detail work. Existing finance-first and master/detail allocations remain; mobile selection scrolls to full detail and returns to the same list/filter/page.
- Internal note form saves through authenticated BFF → real FastAPI → database. Separate default-deny `can_write_notes`, Origin/CSRF, bounded strict payload, existing-learner validation, actor/time/content audit, unique idempotency key, conflict handling, and database immutability are implemented. No notification/message is sent.
- Success is shown only after reading back the saved note. View record opens the canonical learner record with paginated administrator-only note history. Draft discard exists; content-edit unsaved-change behavior remains unfinished.
- Narrow BFF allowlists and strict DTO validation include only GET payments/payment, GET notes and POST notes in addition to the existing identity/directory routes. Provider payment actions remain prohibited. Raw webhook bodies/checkout URLs are never exposed.
- Corrected browser-tested layout/state defects: table child shrink-wrap, dark-panel label contrast, clipped pager captions, mobile detail scroll position, wrong active commerce tab, stale filter captions and rapid Radix filter reopening leaving only an overlay.

## Verification

- `npm test`: **21 passed, 0 failed**. `npm run lint`: exit 0.
- Isolated production Next build: compiled, TypeScript passed. Existing nested-lockfile warning remains.
- `tests/operations-browser.mjs`: actual HTTPS/Next/BFF/FastAPI/database save and readback, canonical note-history navigation, order details, filters, empty result, server pagination, mobile return, active state and pager geometry passed; no browser JS errors.
- `work/pencil-isolated-run.mjs` / `work/pencil-audit.mjs`: all six routes, canonical/mobile navigation, settings/preferences, real search/loading/empty/stale/retry and remaining preview shells passed after the increment. No response-body mocks. The three formerly disabled note/payment shells were replaced in the old regression by the actual operation test, not removed from coverage.
- Final combined build/browser/regression/unit/lint log: `work/pencil/operations-verification.log` (exit 0).
- Backend isolated full suite: **192 passed, 9 skipped, 1 warning in 626.25s**. All nine skips are explicitly opt-in disposable PostgreSQL tests, including one new note test; **separate opt-in PostgreSQL run: 9 passed**.
- Historical/new migration tests: **2 passed**, not skipped. The initial failure was a historical schema test inserting the newest ORM's newly added column. The old revision remains unchanged; its schema-specific insert is retained and the latest ORM is tested against the real full migrated PostgreSQL chain. Full root-cause/evidence and new API contract: backend `docs/ADMIN_OPERATIONS.md`.
- SQLite browser fixture uses core model tables plus both real admin revisions/audit triggers. Full historical migrations contain PostgreSQL-only JSONB and are verified on the disposable PostgreSQL gate, not falsely claimed to run on SQLite.

## Current local preview

**https://localhost:3444** is the latest production-build preview. The managed process `proc_8b2969a6f440` was handed to the parent agent. It owns Next3101, FastAPI8124 and TLS3444, with disposable fixture records and the fixture-only `smoke_operator` account. Login page HTTPS readback is 200; all three new ports were probed open. Browser certificate exception is confined to local test contexts.

The previous 8123/3100/3443 processes were never stopped or rebuilt by this increment; final probes found them already closed. Do not describe 3443 as the latest running preview.

Restart from frontend repo after stopping only the owned new preview:

```
PENCIL_KEEP_PREVIEW=1 PENCIL_TEST_SCRIPT=tests/operations-browser.mjs node work/pencil-isolated-run.mjs
```

This uses the isolated build in `work/pencil/verification-site`, not the root `.next`. Rebuild only that isolated copy when updating it. The runner refuses occupied ports and cleans up only its own child processes and temporary fixture.

## Evidence and limitations

Screenshots inspected: `work/pencil/operations-runtime/transactions.png`, `payment-mobile.png`, `note-saved.png`; machine result `verified.json`. These are real-backend **disposable fixtures**, not production revenue/users or whole-page pixel-parity evidence. Existing full-route captures are under `work/pencil/updated-runtime/`.

The live Pen bridge was disconnected when rechecked; the previously exported native boards/nodes were used without parsing/editing/saving `.pen`. No exact live-design parity claim is made.

Substantial required work remains: catalog/editor/block authoring/publication/import, analytics/cohorts/drilldowns, admin notification detail, exports/arbitrary sorting, reconciliation cases and complete learner access/progress summaries. Those domain models/services exist and should not be called nonexistent. Access changes also require resolving the explicit whole-catalog lifetime product versus old per-section entitlements, and discrepancy/intervention effects require precise definitions. See the complete matrix and backend contract for those distinctions.

No commit, push, production migration or deployment. Existing frontend restoration, immutable archive and bot/payment provider behavior are preserved.
