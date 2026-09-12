# LEAP administrator — first read-only slice

Production runtime: **Next.js 16 / Node.js 22.13+**, not vinext, Wrangler or Cloudflare D1. The browser talks only to the same-origin BFF. The BFF calls one configured private FastAPI origin. Business writes, exports, payments, entitlements, content editing, progress and synthetic analytics are not available.

## Runtime and environment

Use npm and the committed `package-lock.json` only:

```sh
npm ci
npm test
npm run lint
npm run build
npm start -- --hostname 0.0.0.0 --port 3000
```

Set these **server runtime** variables in Coolify (never `NEXT_PUBLIC_*`):

```text
LEAP_ADMIN_API_URL=http://leap-api:8000
LEAP_ADMIN_ORIGIN=https://admin.leapeng.uz
```

`leap-api:8000` is an example private service address: the operator must replace it with the actual fixed backend origin on the private deployment network. The URL must be a canonical HTTP(S) origin, with no trailing slash, credentials, path, query or fragment. Do not append `/api/v1/admin`. HTTPS is preferred for the private hop; HTTP is appropriate only on an isolated trusted network. Never expose the backend directly to browser traffic or make the upstream caller-selectable. Restrict BFF egress and backend ingress to the intended service. Missing/invalid configuration fails closed; no build-time secret is needed.

The browser origin must exactly match `LEAP_ADMIN_ORIGIN` on **both** Next and FastAPI. The Next listener can use private HTTP behind TLS termination; public HTTP must redirect before reaching the application. The BFF does not infer trust from Host, X-Forwarded-Host or any `oai-*` header, and never supplies a missing browser Origin. It forwards the validated browser Origin on POST unchanged.

### Coolify migration order — operator-run, not performed here

1. Back up the existing backend database. Complete independent backend security review and verify the admin migration on disposable staging PostgreSQL, including session concurrency. Follow the separate backend `docs/ADMIN_BACKEND.md`, which is the authoritative contract.
2. On the configured backend deployment, from `apps/api`, run `uv run --python 3.12 alembic upgrade head`. The admin migration is `0a12b34c56de`, after `8a4e2c7d901b`. Do not substitute `metadata.create_all` in production.
3. Set backend `LEAP_ADMIN_ORIGIN=https://admin.leapeng.uz`. Bootstrap an operator using `uv run --python 3.12 leap-api bootstrap-admin operator` on a real terminal; use hidden password entry. Never place a live password in source, arguments or environment. No account is seeded by this frontend.
4. Connect Next to the fixed private backend and set the two runtime variables above. Remove any old Sites/Cloudflare/D1 runtime bindings from this application's configuration. No prototype D1 data migration is appropriate: those records were demos, not authoritative learners.
5. **Change Coolify's existing start-command override.** It must run `npm start -- --hostname 0.0.0.0 --port 3000` (or `next start` with the same binding), NOT the old Wrangler preview command. Updating package.json alone does not replace a saved Coolify override. Set install to `npm ci`, build to `npm run build`, expose port 3000 privately, and terminate TLS at `admin.leapeng.uz`. `/login` is an unauthenticated liveness check, not a backend-readiness check. `/` intentionally redirects unauthenticated requests.
6. Disable CDN/proxy caching on all admin responses, including errors and RSC responses. Preserve `Cache-Control: no-store` and narrowly relayed `Set-Cookie`; do not rewrite cookie Domain/Path. Enforce TLS/HSTS, request-body limit 8 KiB, request header/connection/time/rate/concurrency limits, and private backend networking at the edge. Do not log bodies, Cookie, Set-Cookie, passwords or CSRF. Do not add permissive CORS.
7. Before cutover, run the staging gates below against the actual domain, trusted certificate and private network. Keep business mutations disabled. Roll back by removing admin traffic/restoring the prior deployment only if that deployment's authentication is independently safe; never restore spoofable Sites headers or demo mutation routes as an auth fallback. Backend migration downgrade invalidates admin access and requires its documented backup/rollback procedure.

No deployment, production migration, live account provisioning, commit or push is part of this patch.

## Boundary and UI

The BFF allows only:

| Browser path | Method | Fixed upstream path |
|---|---|---|
| `/api/admin/login` | POST | `/api/v1/admin/login` |
| `/api/admin/session` | GET | `/api/v1/admin/session` |
| `/api/admin/logout` | POST | `/api/v1/admin/logout` |
| `/api/admin/overview` | GET | `/api/v1/admin/overview` |
| `/api/admin/learners` | GET | `/api/v1/admin/learners` |

The server page validates `/session`; every read is separately authorized by FastAPI, so expiry/revocation/disabled accounts are rechecked. Login requires actual exact Origin and `X-Admin-CSRF: login`; logout forwards the in-memory CSRF token acquired with the session. Login and logout change authentication state only. The opaque session never enters JSON or localStorage. Only `__Host-leap_admin` is forwarded: Secure, HttpOnly, SameSite=Strict, Path=/, no Domain. Login/logout cookies are validated against the narrow contract then relayed **verbatim**. Other headers/cookies are not proxied. Duplicate session cookies fail closed.

Bodies are streamed with byte limits (8 KiB request, 256 KiB upstream response), request-body deadline 8 seconds and upstream deadline 8 seconds. Redirects are rejected, not followed. Strict success DTO validation rejects malformed data and numeric Telegram IDs. Upstream error details are not echoed; only known safe status/code messages are returned. All BFF results, including errors/configuration failure, are no-store. The BFF is guarded by `server-only` imports; tests use Node's `react-server` export condition, not an application auth bypass.

Overview displays only four real database totals. Learners use server pagination (25 rows), authoritative filtered total, exact case-sensitive username equality and string IDs. Timestamps are displayed as returned, not interpreted as online status. Empty and failure states never show demos. Counts/pages may drift under concurrent learner activity, as documented by the backend. Unsupported navigation sections explicitly say Unavailable and expose no actions.

Existing palette, theme provider, fonts, action styling and top-navigation concept are retained. This is a functional replacement of demo data surfaces, **not a claim of Pencil/graphical parity**. No `.pen` file was read. Legacy Sites auth, D1/demo code and build scripts are quarantined in `archive/legacy/`, outside runtime/TypeScript/Tailwind source graphs. Do not run those scripts, particularly the old destructive `check-admin.mjs`. Existing local `.wrangler` database state was not touched.

## Local HTTPS development — no bypass

Configure both Next and your isolated backend with `LEAP_ADMIN_ORIGIN=https://localhost:3443`; set Next `LEAP_ADMIN_API_URL` to the fixed private local API origin. Run Next on loopback port 3100 with `npm run dev -- --port 3100`. Put a local TLS proxy on `https://localhost:3443` forwarding unchanged browser headers to `http://127.0.0.1:3100`. Use a trusted development certificate (for example an operator-installed mkcert certificate), not a Secure-cookie exception. `tests/tls-proxy.mjs <key-file> <cert-file>` is a loopback-only convenience TLS proxy for those fixed ports. Keep private keys outside version control. Never browse the private HTTP Next listener to work around cookie requirements.

For **automated disposable smoke only**, create a short-lived self-signed certificate:

```sh
mkdir -p work/smoke
openssl req -x509 -newkey rsa:2048 -nodes -keyout work/smoke/key.pem -out work/smoke/cert.pem -days 2 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost'
npm run build
node tests/production-smoke.mjs 'C:/Users/user/Documents/My PROJECTS/LeapEnglish/apps/api'
```

This smoke harness currently targets this Windows checkout: installed Edge and backend `.venv/Scripts/python.exe` (Python 3.12) are prerequisites. It refuses occupied ports 8123/3100/3443, launches the real production `next start`, a loopback TLS proxy and real FastAPI with disposable SQLite, clears inherited `LEAP_*` integration settings, and uses `_env_file=None`. It provisions only a disposable fixture account/database, not live data. The only test certificate exception is Playwright's isolated `ignoreHTTPSErrors` context; it does not disable Secure, HttpOnly, SameSite or backend Origin/CSRF. It cleans up child servers and its owned temporary database directory. There is no API interception or fabricated upstream response in this browser test. Unit tests separately inject malformed responses to exercise validation/failure handling.

## Verification and remaining release gates

Observed locally: Node 22.23.2; Next production compilation and TypeScript passed; lint passed; unit/architecture security tests passed. Real Edge browser smoke passed over local HTTPS through production Next and real FastAPI/SQLite: spoofed page/API denied, missing Origin denied, login cookie flags and HttpOnly verified, four fixture SQL counts, 25+2 pagination, exact-case filter/empty result, large string ID, unavailable section, theme and mobile overflow, business POST blocked, logout CSRF denial, cookie deletion and revoked-cookie replay denied, no browser JS errors. Fixture counts (27 learners, 0 courses/sections/lessons) are test data, **not production metrics**. Screenshots are ignored under `work/smoke/`.

Before release: independently review this BFF; rerun with the final reviewed backend; actual PostgreSQL migration/session-concurrency verification; actual Coolify command/network/TLS/no-store and cookie behavior at `admin.leapeng.uz`; production perimeter limits/HSTS/log redaction; operator login, expiry/revocation/disabled-account and outage recovery; keyboard/screen-reader QA and visual acceptance at 320–430 px and desktop against approved MCP-accessed design. Local self-signed Edge testing does not prove trusted-certificate staging behavior, cross-browser parity or graphical parity.
