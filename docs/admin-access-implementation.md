# Administrative access frontend/BFF

Implemented against `apps/api/docs/admin-access.md` and backend revision
`4e56f78a90bc`. This is a local verification record, not deployment approval.

## Delivered

- The existing Overview Manage access dialog and shared visual classes remain.
  Its selector offers exactly Lifetime and No access. No page, navigation,
  stylesheet, archive design tree or Pencil file was changed.
- No access warns that even paid access and future payments are blocked, while
  the first 3 Foundation lessons stay free; history is preserved.
- Reason (20–1000 characters), review, and the signed-in administrator's current
  password are required for revocation. The password input is masked with
  `autocomplete=current-password`. It is not stored in React string state,
  request fingerprints, browser storage, logs, error messages or toasts.
  The field is cleared on submit, failure, Back, cancellation and cleanup.
- Existing session/Origin/CSRF checks and server business permission checks remain.
  Versions come from `accessVersion`; explicit denial is read from `accessOverride`,
  so paid-only learners without a catalog grant remain actionable.
- Request UUID/fingerprint excludes the password and includes the operation.
  Transport retry retains its UUID; conflicts require reloading and reviewing.
  Successful writes/replays refetch current state. Readback failure is shown
  separately as committed-but-not-verified with a read-only verification retry.

## Routes and errors

- `POST /api/admin/business-revoke` → fixed upstream
  `POST /api/v1/admin/business/catalog-revocations`.
  Strict body: requestId, string learnerId, baseVersion, reason, password only.
- `POST /api/admin/business-grant` remains mapped to
  `POST /api/v1/admin/business/catalog-grants`, without password.
- `GET /api/admin/business-state` accepts the added access state/version/override
  fields. Grant and revoke responses are strictly validated, including target,
  reason, next version and expected access decision.
- Reauthentication 401 retains its sanitized dedicated error and does not log
  the operator out; expired-session 401 redirects to login. 403, 409, 422 and 429
  retain bounded local error messages. Internal/malformed upstream failures become
  generic 502. No raw upstream messages are rendered.

## Evidence

- `npm test`: 34 passed, none skipped.
- `npm run lint`: no errors or warnings.
- `npm run build`: production Next build and TypeScript passed.
- `node tests/live-layout-run.mjs`: real local HTTPS browser → production Next BFF
  → actual FastAPI → owned disposable SQLite; all assertions passed and owned
  processes/build/database directories were cleaned up.
- `tests/business.test.mjs` covers strict revocation/grant/state DTOs, denied
  malformed secrets, response identity, CSRF/session boundaries and sanitized errors.
- `tests/access-browser.mjs` covers a legacy paid-only learner, required review
  and password, wrong-password recovery, clearing, actual denial/lifetime readback,
  preserved payment/section entitlement, lost-response replay with the same UUID,
  concurrent stale-version conflict and verification-read failure recovery.
- `tests/live-layout-runtime.mjs` also checks all six routes at desktop/mobile:
  no row/pager/document horizontal overflow and no uncaught page errors.
- Screenshots and machine-readable results are under
  `work/pencil/updated-runtime/` (including `access-before.png`,
  `access-denied.png`, `access-verified.json`, `results.json`).

The first UI test failed on the missing access selector before implementation.
BFF tests first failed on new state fields, the absent revoke route, the new
lifetime DTO and reauthentication code. A later failing browser regression caught
hidden verification-read errors/stale success copy; it now passes.

## Remaining gates

No live account access changed. No commit, push or deployment was performed.
Backend PostgreSQL race/migration and actual Mini App lesson/media enforcement
are separate backend acceptance evidence; this browser fixture is SQLite and does
not claim PostgreSQL concurrency coverage. Existing design layout is retained,
not a claim of newly audited pixel parity with Pencil. Deploy the reviewed backend
migration before this frontend. The isolated copied-build runner emits a benign
multiple-lockfile workspace warning; the normal production build is clean.
