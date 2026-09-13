# Original design restoration — verification and limits

This records the initial restoration run. See [Current Pencil follow-up](pencil-verification.md) for subsequent direct Pen.exe inspection, the light-default change, and fresh 12-test / both-theme verification. Counts and unchanged-theme-provider statements below describe the earlier run, not the final follow-up state.

## Result

The authenticated workspace renders the original six screen trees from `183af91` / `archive/legacy/app/design.json`, rather than the replacement `admin-shell`. Card allocations, navigation, master-detail columns, typography classes and theme tones are retained. The secure Next login, server-side page guard, session/CSRF handling and read-only BFF remain unchanged.

The archive is unchanged, byte-for-byte against `git show 183af91:app/design.json`:

`SHA-256 2db7e4c5add4ef24277bebd73c15d5c2d2a4261d553536f22e851e79500c8e6a`

`app/leap.css` is unchanged from HEAD and matches the original after CRLF normalization. `app/appearance.css` and `app/theme-provider.tsx` match the original bytes. The existing Funnel Sans / IBM Plex Mono imports and controls are retained; the browser verification explicitly loads both families before comparison.

## Data adaptation, not demo restoration

- `lib/design-static-copy.json` is an explicit node-name + exact-copy audit. Unlisted or changed archive text becomes `—`; a generic value allowlist is deliberately not used because words such as `Paid` can otherwise leak into record badges.
- Original analytics cards stay in place. Missing activity, revenue, completion, health, progress and message observations are `—`, not fabricated zeroes. Original chart allocations remain, but their data-encoding marks are hidden and labelled unavailable.
- Registered learner count is the real `learnersTotal`. Active learners and lessons completed remain unavailable. All four database totals are labelled separately in a read-only footer, including the draft/unpublished caveat.
- The original learner list and commerce eight-column table shapes use real paginated learner DTOs. Name, username, string Telegram ID and registered date are displayed where appropriate. The full-record dialog exposes all seven DTO fields and explicitly distinguishes last-seen timestamp from current presence.
- Username filtering is exact and case-sensitive, with 25-row server pagination and the server's `hasMore`. Selection, next/previous, clear, empty state, failure/retry and overview-to-profile selection are exercised.
- Original unsupported action controls stay in place, disabled with an API-contract explanation. No demo mutation, export, course/catalog record, paid/access status, message history or authentication-header trust was restored.
- Real API pages are larger than the five-row original demo. Minimal flex/scroll constraints keep the directory and pager inside the original desktop allocation and prevent mobile clipping.

## Verified

Authoritative complete run: [`work/smoke/restoration-verification.log`](../work/smoke/restoration-verification.log).

- `npm test`: **11 passed**, including security checks and original-tree/static-copy regressions.
- `npm run lint`: passed.
- `npm run build`: passed; production Next routes generated successfully.
- Production HTTPS Edge smoke against the real FastAPI application and a disposable SQLite database: passed.
- Actual DOM parent edges and original class tokens checked on all six routes, excluding the explicitly enumerated dynamic list/search/utility slots.
- **22** desktop card/workspace bounding-box comparisons across six dark routes and the light learner route: **0 px maximum measured delta**. Assertion tolerance is 1 px.
- All six routes exercised at 390 px in light mode without document horizontal overflow. Learner pager containment and mobile selected detail also checked.
- Existing spoofed-header denial, Origin checks, no-store, Secure/HttpOnly/SameSite cookie flags, 25+2 pagination, case-sensitive filter, large string ID, mutation denial, logout CSRF, deletion and revoked-cookie rejection retained.
- Browser offline mode exercises a real network failure and recovery without fabricated API response injection or stale identities/fake zero rows.
- Zero browser JavaScript errors.
- Cleanup independently verified: fixture directory removed and ports 8123, 3100, 3443 free.

TDD iterations caught the missing original-tree adapter, accidental static `Paid` status leakage, lost static selector/detail labels, desktop list growth, mobile pager clipping, selection loss across profile navigation, missing Retry control and false zero rows during failure before their respective fixes.

A terminal wrapper timed out during one resource-constrained build; its owned process continued and the complete verification log records the successful build and smoke. A concurrent retry correctly refused the occupied fixture port. No unrelated process was terminated.

## Screenshots

All application screenshots show records read from the **disposable real-backend fixture**, not production learner data. Names such as `Disposable` are actual fixture database rows, not application demo defaults.

| Route | Restored desktop / dark | Immutable tree reference | Restored mobile / light |
|---|---|---|---|
| Overview | [Screenshot](../work/smoke/overview-dark.png) | [Reference](../work/smoke/reference-overview-dark.png) | [Mobile](../work/smoke/overview-light-mobile.png) |
| Learners | [Screenshot](../work/smoke/learners-dark.png) | [Reference](../work/smoke/reference-learners-dark.png) | [Mobile](../work/smoke/learners-light-mobile.png) |
| Content | [Screenshot](../work/smoke/content-dark.png) | [Reference](../work/smoke/reference-content-dark.png) | [Mobile](../work/smoke/content-light-mobile.png) |
| Commerce | [Screenshot](../work/smoke/commerce-dark.png) | [Reference](../work/smoke/reference-commerce-dark.png) | [Mobile](../work/smoke/commerce-light-mobile.png) |
| Learning | [Screenshot](../work/smoke/learning-dark.png) | [Reference](../work/smoke/reference-learning-dark.png) | [Mobile](../work/smoke/learning-light-mobile.png) |
| Messages | [Screenshot](../work/smoke/messages-dark.png) | [Reference](../work/smoke/reference-messages-dark.png) | [Mobile](../work/smoke/messages-light-mobile.png) |

Additional evidence: [light desktop](../work/smoke/learners-light-desktop.png), [light reference](../work/smoke/reference-learners-light.png), [empty state](../work/smoke/learners-empty-dark.png), [mobile detail](../work/smoke/learner-detail-light-mobile.png), [network failure](../work/smoke/commerce-network-error-light-mobile.png). There are **23 screenshot files**. Raw measurements are in `work/smoke/geometry-*.json`.

## Exactness limits

- The live ChatGPT Sites reference was **not visually verified**. The parent session's public-access recheck still reached an authentication/security-verification page. No bypass was attempted.
- `tests/visual-reference.mjs` renders the immutable source tree and original CSS in an isolated nonproduction browser context. It is a geometry/style baseline, **not a recreation of the old interactive demo runtime** and not a screenshot of the live link. Original sample labels appear only in this fixture reference.
- This is not a whole-page pixel-identity claim: real identities, unavailable values/marks, disabled actions, exact-filter/pagination controls and a new read-only totals/logout footer necessarily differ. The measured original card/workspace allocations are identical; utility controls and dynamic slots are not covered by that geometry assertion.
- Payment/access operations, content editing/publishing/catalog detail, analytics, messages, exports and notes remain unavailable until approved backend contracts exist. Original panels remain visible rather than being replaced by blanket unavailable pages.
- Local HTTPS uses a self-signed certificate exception restricted to the disposable browser context. No deployment or trusted-certificate staging verification was performed.

## Changed repository paths

Modified:
- `app/leap.tsx`
- `app/admin.css`
- `app/globals.css`
- `tests/runtime.test.mjs`
- `tests/production-smoke.mjs`

Added:
- `lib/design-adapter.mjs`
- `lib/design-static-copy.json`
- `tests/design.test.mjs`
- `tests/visual-reference.mjs`
- `docs/design-restoration.md`

Generated local evidence: `work/smoke/*.png`, `work/smoke/geometry-*.json`, verification logs. No backend, archive, BFF, login or session implementation was changed. No commit, push or deployment was made.
