# Pen canvas parity audit — exact parity is NOT achieved

> Frontend implementation has since progressed: see [pencil-frontend-implementation.md](pencil-frontend-implementation.md) for the canonical nav, safe dialogs, real search, data states and new runtime evidence. The reference inventory below remains authoritative; the old implementation-gap table and previous test counts are historical.

This supersedes the earlier 38%/partial-Pencil evidence. **Do not deploy on the basis of a parity claim.** The current design is accessible, and the complete reference reveals substantial unimplemented interaction states in addition to visual differences.

## Authoritative reference acquisition

Desktop capture could not resolve the off-screen Pen window in this session. Instead, discovered the installed Pen MCP binary at `C:/Users/user/AppData/Local/Programs/Pen/resources/app.asar.unpacked/out/mcp-server-windows-x64.exe`. Its actual `--help`, MCP initialize and tools/list were inspected. `-app desktop` connected to `\\.\pipe\pencil-desktop`. `get_app_state` confirmed the open `leap-admin-light-complete.pen` in this repository.

Read the server's `read_skill({path:"execute.md"})` documentation before using its `Get`, `GetVariables`, `TakeScreenshot` and `Export` operations. **No Insert/Update/Delete/Copy/Move/Replace/Generate/SetVariables or save operation was sent; no ordinary reader parsed the .pen file.** Export reads the open editor, including its current unsaved state, rather than assuming the disk file is current.

The live canvas contains **15 top-level boards and 2,702 resolved nodes**. Exported all 15 boards as native-size PNG, verified each image's dimensions against its live bounds. `TakeScreenshot` produced a small preview; the exported PNGs, not an enlarged 38% screenshot, are the legible references.

Reference manifest: [`work/pencil/inventory.json`](../work/pencil/inventory.json). Full geometry, text, font and fill values: [`nodes.json`](../work/pencil/nodes.json).

| Board | Native dimensions | Actual Pen PNG |
|---|---|---|
| Overview | 1440×1000 | [bi8Au](../work/pencil/full/bi8Au.png) |
| Reusable navigation | 1400×72 | [O3oJS8](../work/pencil/full/O3oJS8.png) |
| Commerce | 1440×1780 | [uYGzD](../work/pencil/full/uYGzD.png) |
| Learners | 1440×1000 | [C5tZxu](../work/pencil/full/C5tZxu.png) |
| Content | 1440×1000 | [DUfwI](../work/pencil/full/DUfwI.png) |
| Learning | 1440×1000 | [KNuM1](../work/pencil/full/KNuM1.png) |
| Messages | 1440×1000 | [nqETx](../work/pencil/full/nqETx.png) |
| Shared data states | 1440×390 | [dJbzn](../work/pencil/full/dJbzn.png) |
| Payment responsive contract | 1440×820 | [p2ZCOJ](../work/pencil/full/p2ZCOJ.png) |
| Transactions/reconciliation | 1440×720 | [NuLlW](../work/pencil/full/NuLlW.png) |
| Mobile navigation | 430×700 | [IhJxo](../work/pencil/full/IhJxo.png) |
| Shared interaction states | 1440×1840 | [r2iEu](../work/pencil/full/r2iEu.png) |
| Operations interaction states | 1440×1840 | [CTwDe](../work/pencil/full/CTwDe.png) |
| Content interaction states | 1440×1840 | [akMjF](../work/pencil/full/akMjF.png) |
| Navigation/filter/edge states | 1440×1840 | [zSgOv](../work/pencil/full/zSgOv.png) |

## Actual application comparison

Captured all six routes at 1440×1000 in light mode, with real authenticated requests to the existing disposable backend. Then built the updated source in an isolated `work/pencil/verification-site` copy and repeated the audit through production Next 3101 → HTTPS 3444 → separate real FastAPI 8124 → separate disposable SQLite. No API response injection, fake application observations, authentication bypass or production/backend writes were introduced.

Updated production-runtime captures (14 PNGs) are in [`work/pencil/updated-runtime`](../work/pencil/updated-runtime/). All six route screenshots, settings, account, learner record, exact-search behavior, empty state, mobile navigation, sign-in and actual network failure are preserved. Theme persistence, Escape closure and network Retry recovery were also exercised; zero browser JavaScript errors. Runner: `work/pencil-isolated-run.mjs`; successful complete log: [`isolated-verification.log`](../work/pencil/isolated-verification.log).

Raw comparisons use **actual Pen bounds/colors/typography**, not the immutable Git-source fixture:

- 1,154 uniquely matched node IDs across the six routes; repeated learner rows and unmatched component-instance IDs are excluded, not claimed as verified.
- 43 root/direct structural measurements; 2 differ by over 1 px: Overview Primary Navigation x −15.125 px / width −2.375 px, and Navigation Utilities x −32 px / y −3 px / width +32 px / height +6 px. Canvas root translations are removed before comparison.
- 692 comparable solid fill/text-color values; **132 differ**. This is a diagnostic count, not a pixel-diff score. It includes unavailable/disabled data slots and does not account for opacity, gradients, anti-aliasing or every computed style.
- 174 unchanged-text samples match font family, size and normalized weight. This does **not** establish exact line-height, letter-spacing, kerning or wrapping everywhere.
- Details: [`comparison-summary.json`](../work/pencil/comparison-summary.json), `comparison-<board>.json`, [`typography-summary.json`](../work/pencil/typography-summary.json).

## Verified correction

The live Pen design sets **both gradient stops to #6655BB** on all six main violet panels. The frontend previously invented a two-tone #7362C6 → #5B50AD gradient. Changed only that light-mode gradient rule in `app/appearance.css`.

`tests/pencil-palette.mjs` was run RED first (actual old computed colors), then GREEN. After an isolated production build, computed backgrounds from all six real route captures independently matched `linear-gradient(125deg, rgb(102, 85, 187), rgb(102, 85, 187))`. See [`palette-result.json`](../work/pencil/palette-result.json). Dark mode, data adapters, auth/BFF and existing source trees are unchanged by this correction.

## Interaction inventory / remaining acceptance gaps

The four large state boards contain **36 named state cards**. Inspected their rendered boards and live text/geometry. Most have no matching implementation to exercise; a disabled button is not UX parity.

| Board | State cards | Current implementation / blocker |
|---|---|---|
| Shared | Search LEAP; Date range; Workspace settings; Admin profile; Learner record; Export report; No results; Refresh failed; Data is updating | Search routes to the learner exact-username filter instead of opening the cross-entity search dialog. Settings/account/record/empty/error exist but their visible layouts and available fields differ. Date/export disabled. No matching stale-data banner/skeleton composition. |
| Operations | Add internal note; Manage access; Confirm access change; Changes saved; Record changed; Payment details; Reconciliation case; Resolve discrepancy; Learning intervention | Unsupported. Notes/access/payment/reconciliation/intervention APIs and corresponding workflow states do not exist in this read-only frontend contract. Do not fabricate saved, resolved, payment or conflict results. |
| Content | Create lesson; Video block; Key phrases; Quick check; Lesson navigation; Lesson preview; Ready to publish; Publication blocked; Import content | Unsupported catalog/editor/preview/publication/import workflows. Visible shell allocations remain, but disabled controls and unavailable copy are not working design interactions. |
| Navigation/filter/edges | Sign in; Notification detail; Cohort filter; Chart drilldown; Sort & paginate; Unsaved changes; Reorder lesson blocks; Payment filters; Required field | Real secure sign-in exists but is visually different. Exact-username 25-row pagination exists but does not implement the design sort/filter control. Notification details, cohort/chart/payment filters and editor states are not implemented. |

Additional full-board gaps:

- Mobile design is a full-width navigation composition with LEAP branding, description, counts and account area. Runtime is a 365 px left Sheet at a 430 px viewport, with different spacing/content and no badges. See [actual runtime](../work/pencil/updated-runtime/mobile-navigation.png) versus [Pen](../work/pencil/full/IhJxo.png).
- Commerce transactions/reconciliation board and desktop-to-mobile payment detail contract are not implemented as actual API-backed payment workflows. Runtime reuses learner identities with unavailable payment values, not payment DTOs.
- Charts, activity, progress, payment statuses and metrics differ because observations are unavailable. The design's sample identities/counts must not be copied into production to make screenshots appear identical.
- Extra exact-filter/pager controls and the read-only totals/logout footer remain intentional integration differences. The footer increases screenshot height beyond the Pen board.
- Overview's own navigation and the separate reusable navigation board differ (the reusable board includes the appearance utility). This needs an explicit canonical component decision, not silently deleting theme support to win one measurement.

## Verification and process safety

- Palette browser regression: passed after observed failure.
- `npm test`: 12 passed, 0 failed.
- `npm run lint`: passed.
- Isolated production build: compiled and TypeScript passed. First build missed the vendored CSS in the isolated copy; copying the existing `vendor/` prerequisite fixed it without changing production code. Next emitted only the nested-lockfile workspace-root warning.
- An initial alternative-origin attempt correctly returned 403 because the old fixture was bound to 3443. Kept Origin protection intact and started a separate fixture configured for 3444 instead.
- Added explicit API readiness after an early 502 and Windows file-release retries after an EBUSY cleanup. Final complete isolated runner exited 0.
- Only owned 8124/3101/3444 servers were stopped. Final probes: those ports closed; user's 8123/3100/3443 remain open. **The user-facing https://localhost:3443 was not rebuilt/restarted and therefore still serves the earlier palette.** Updated code is verified only in the isolated production build.
- No commit, push or deploy. No design document edits or save operation.

## Deployment decision

**Blocked on parity, not on design access.** No further screenshot export is needed: all boards are now available. Remaining work is a substantial frontend state implementation plus approved backend contracts for unavailable operations and a decision on read-only/data-slot exceptions. Exact UI/UX cannot honestly be certified while those controls are disabled and these visible differences remain.
