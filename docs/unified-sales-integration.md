# Unified sales frontend integration

## Contract and presentation

- Existing summary `paidOrders`, `revenueTiyin`, `previousRevenueTiyin`, daily series, products and payment methods are canonical **combined** app + CRM values. The browser must never add nested CRM totals again.
- `sales` and `crmSync` remain optional for rolling compatibility. Known counts, money strings, timestamps and status values are bounded/validated. Summary root, sales/sync objects and transaction read DTOs project the explicit allowlist rather than forwarding unknown upstream fields; the BFF streamed body cap remains unchanged. Authentication, CSRF, mutation validation and route allowlist are unchanged.
- Whole-catalog products have `sectionId: null`. CRM ledger rows have `source: crm`, `gateway: CRM`, nullable `learnerId`/`externalId`, and prefixed IDs up to 40 characters. App learner identity stays required. `includedInSales` is nullable/optional and never inferred from payment status.
- Existing four metrics, tabs, table columns, provider chart, detail panels, CSS and navigation are retained. Source/sync facts use the current detail fact list. Unknown learners never trigger a null/empty learner lookup. CRM/Tribute extend only the existing method selector.
- Sync copy says *last* successful sync, not that data is fresh now. Missing metadata and errors are not rendered as zero sales or success. Raw integration errors are not displayed in the UI.

## Verification

```bash
npm test
npm run lint
npm run build
UNIFIED_SALES_ONLY=1 node tests/live-layout-run.mjs
```

Verified: 63 unit/contract tests, lint, production build and focused real HTTPS/Next/FastAPI/SQLite browser run. The fixture clears inherited LEAP settings and disables dotenv. It seeds one canonical app sale, one matched CRM sale and one unmatched CRM sale: 3 sales / 90000 tiyin. The real BFF validates the combined summary and both CRM details. Browser-only interception then exercises combined metrics, 60% CRM provider share, unmatched learner, existing method filter, legacy metadata, sync errors and unavailable states at 1440 and 430 px. No page errors or document horizontal overflow.

Evidence (ignored runtime artifacts): `work/unified-sales-browser.log`, `work/pushday/updated-runtime/commerce-unified-{1440,430}.png`.

The broad pre-existing live-layout runner is not claimed green: its earlier default run stops at a stale `Username` search locator (current label is `Qidiruv`). The focused mode leaves those default assertions intact and limits verification to this slice. Disposable fixture setup was updated with bot-start timestamps and the annual-access migration; otherwise current backend filtering/schema made the old fixture empty or fail.

## Independent review fixes

- Learner payment summaries count and sum eligible rows across every upstream page, not ledger `total`. Explicit `includedInSales: false` rows do not contribute to count, amount or last-payment timestamp. Compatibility assumption: omitted/null eligibility retains legacy paid-row aggregation; the transaction eligibility label still says unavailable rather than claiming canonical eligibility. Both learner count/amount sorting and profile-enriched summaries use this same aggregation. Last payment is the latest eligible instant, independent of creation-order pagination.
- Source money uses BigInt quotient/remainder and exactly two decimal places, preserving fractional tiyin and values beyond safe Number precision.
- The BFF projects nonempty `crmSync.lastError` to fixed `sync_error`; null/empty becomes null. Raw diagnostic text never reaches browser JSON. Existing bounded input validation and explicit backend `status: error` remain effective, including when lastError is absent as an error signal (null/empty).
- TDD evidence: canonical excluded app 10000 + eligible CRM 30000 failed as 2/40000 before fixing to 1/30000; latest eligible timestamp, 199 tiyin formatting, and sentinel diagnostic leakage each failed before their fixes. Final focused tests: **14 passed**; full `npm test`: **69 passed, 0 skipped**. `npm run lint`, `npm run build`, and `git diff --check` exited 0 on Node v24.18.0 / npm 11.16.0. Git only reported pre-existing LF/CRLF normalization warnings. No browser rerun was performed for these adapter/formatter corrections, and no UI composition/styles changed.

## Integration boundaries

Deploy canonical API/migration before this frontend. The frontend does not synchronize CRM, deduplicate sales or grant access. Financial-source correctness and PostgreSQL view/migration validation belong to the backend. Current backend `/payment` returns no entitlement for CRM; matched CRM access consequently remains `Tekshirish kerak`, not an invented grant. No production verification, commit, push or deployment was performed by this worker. No visual pixel-parity claim beyond unchanged styles/composition and inspected local screenshots.
