# LeapEnglish / Leap Admin / Coolify — topshirish ma’lumoti

## 1. Ish holati va cheklov
Ish foydalanuvchi buyrug‘i bilan TO‘XTATILGAN. Bu hujjat ishni davom ettirish buyrug‘i emas. Oxirgi ishlar tugallanmagan, commit/push/deploy qilinmagan. Ikkala repoda modified va untracked fayllar bor; faqat GitHub clone qilish oxirgi ishlarni olib kelmaydi. Reset/clean/checkout bilan o‘chirib yubormang. Maxfiy .env, sertifikat private key, cookie va bazalarni chatga yoki Gitga qo‘shmang.

Maqsad: admin panel Pencil’dagi asl UI/UX bilan birga bir mos bo‘lsin; faqat haqiqiy ma’lumotlar oqimi moslashishi mumkin. Dizaynni generic dashboardga almashtirish mumkin emas. Foydalanuvchi lokal ko‘rinishni tasdiqlamaguncha push/deploy qilinmaydi. Soxta raqamlar, demo success, ishlamaydigan tugmalar tayyor ish hisoblanmaydi.

## 2. Repolar — handoff vaqtida git orqali tekshirildi
| Qism | Lokal manzil | GitHub | Branch | Oxirgi commit |
|---|---|---|---|---|
| Asosiy loyiha/API | C:/Users/user/Documents/My PROJECTS/LeapEnglish | khan-umirzakoff/LeapEnglish | release/admin-readonly | 476b944 |
| Admin frontend | C:/Users/user/Documents/My PROJECTS/Leap Admin panel | Alpina990/Leap-admin-panel | release/admin-readonly | f6f785a |

Ikkala working tree DIRTY. `main` ga yangi ishlar qo‘yilmagan. Asl frontend dizayn Git tayanchi: 183af91. `archive/legacy/` — o‘zgartirilmasin; eski ChatGPT auth, Wrangler/D1/demo ishlashini productionga qaytarmang.

## 3. Arxitektura
Browser -> Next.js same-origin `/api/admin/*` BFF -> private FastAPI `/api/v1/admin/*` -> PostgreSQL.
Admin: Next.js16, React19, Node22.13+, npm. API: Python/FastAPI, SQLAlchemy, Alembic.
Auth: persisted admin, scrypt password, hashed opaque sessions, Secure/HttpOnly/SameSite cookie, exact Origin va CSRF, no-store, default-deny permissions. Auth va BFF himoyasini saqlang. Yangi business endpointlar uchun DTO/BFF allowlist/permission/CSRF/audit/idempotency/conflict testlari kerak.

## 4. Coolify
Panel: https://server.narz.uz
Project: LeapEnglish; environment: production.
Resurslar alohida: Leap Admin, LeapEnglish API, LeapEnglish Mini App, LeapEnglish Bot, LeapEnglish DB.
MUHIM: Mini App backend emas. API sozlamalarini Mini App resursiga kiritmang.

### Leap Admin
Domain: https://admin.leapeng.uz
Repo: Alpina990/Leap-admin-panel; release/admin-readonly, HEAD.
Oldingi tasdiqlangan konfiguratsiya: Railpack/Dynamic, `npm ci`, `npm run build`, start `npm start -- --hostname 0.0.0.0 --port 3000`, internal/exposed port3000.
Runtime env:
- LEAP_ADMIN_API_URL=http://leap-api:8000
- LEAP_ADMIN_ORIGIN=https://admin.leapeng.uz
`leap-api` haqiqiy API network alias bo‘lishi va resurslar bir private tarmoqda bo‘lishi kerak. URLga /api/v1/admin yoki trailing slash qo‘shmang. NEXT_PUBLIC_ ishlatmang.

### LeapEnglish API
Repo: khan-umirzakoff/LeapEnglish; release/admin-readonly, HEAD.
Dockerfile: /apps/api/Dockerfile; base /; port8000; network alias leap-api.
Runtime env: LEAP_ADMIN_ORIGIN=https://admin.leapeng.uz. Boshqa mavjud DB/bot/provider envlarini o‘chirmang yoki ko‘chirmang.
Entry point avtomatik `alembic upgrade head` va mavjud content import amallarini bajaradi. Yangi migratsiyalarni deploy qilish production DBga yozadi: avval backup, migration/rollback va import-overwrite xavfini tekshiring.

Coolify menyulari: env -> Environment Variables -> + Add; branch -> Deploy -> Git Source; log -> Observe & troubleshoot -> Runtime Logs. Advanced -> Git branch tanlash joyi emas; Advanced -> Logs -> Log drain runtime log oynasi emas.

Oldingi production holati: API admin auth migratsiyasi 0a12b34c56de deploy bo‘lgan, readiness200 va bootstrap `Administrator created.` foydalanuvchi tomonidan tasdiqlangan. Parol bu hujjatda yo‘q. Keyingi notes/content/business migratsiyalari productionga qo‘yilmagan. Hozirgi Coolify holatini yangi agent qayta tekshirishi shart.

Tarixiy nosozlik: TRAEFIK DEFAULT CERT/503, Wrangler127.0.0.1:8787 bilan Coolify3000 nomuvofiqligi; keyin ChatGPT Sites login404. Production Next runtimega o‘tilgan. Eski Wrangler start override’ni qaytarmang. TLSni yoki authni o‘chirish yechim emas.

## 5. Dizayn manbalari
Pen/Pencil ochiq hujjat: leap-admin-light-complete.pen (untracked, oldin Edited holatida bo‘lgan). .pen’ni o‘zgartirmang/saqlamang. Oddiy file reader o‘rniga Pen’ning MCP readeridan foydalanilgan.
Reference URL https://leap-english-admin-panel.a-bbot-tburdett6269.chatgpt.site oldin OpenAI loginiga redirect qilgan; unga kirildi yoki exact parity isbotlandi demang.
Actual Pen eksportlari: work/pencil/full/*.png, inventory.json, nodes.json. 15 board,36 interaction card. work/pencil-read.py — oldingi read-only MCP runner. Pen integratsiyasi oxirgi qayta tekshiruvda disconnected edi.
Canonical reusable navigation board: O3oJS8. Light main purple:#6655BB. Asl source-tree geometry testi Pencil pixel parity degani emas.

## 6. Oxirgi to‘liq tekshirilgan increment
- Asl oltita route tuzilishi, canonical nav, light/dark va saqlangan tema, full-width mobile nav.
- Login, settings/profile/learner oynalari, exact username global-search dialog, loading/empty/stale/retry.
- Haqiqiy PaymentOrder ro‘yxati/status-method filter/pagination/detail, mobile detail return. Provider amallari yo‘q.
- Ichki notes: real DB save/readback, admin-only history, can_write_notes default-deny, immutable audit, Origin/CSRF va idempotency.
Dalillar: docs/admin-operations-implementation.md; backend docs/ADMIN_OPERATIONS.md.
Shu increment: frontend21test+lint+isolated build+real HTTPS browser PASS; backend192passed9skipped; opt-in PostgreSQL9passed; targeted migration2passed.
Bular oxirgi TO‘XTATILGAN o‘zgarishlar uchun yakuniy PASS emas.

## 7. To‘xtatilgan, qayta tekshirilishi shart bo‘lgan ish
Frontend yangi untracked fayllar: app/content-dialog.tsx, app/reporting-dialog.tsx, lib/admin-content-contract.mjs; tests/content*,notifications*,reporting*. Oldingi payments/notes/nav fayllari ham uncommitted.
Backend modified: admin.py,main.py,models.py,services/content_import.py,entitlements.py,lesson_access.py va admin testlar.
Yangi backend: admin_content.py,admin_business.py; test_admin_business.py,content.py,notifications.py,operations.py,reporting.py.
Yangi migratsiyalar:
-1b23c45d67ef_admin_notes.py
-2c34d56e78fa_admin_content.py
-3d45e67f89ab_admin_business.py

Backend docs/ADMIN_BUSINESS_IMPLEMENTATION.md business router worker paketida main.py ga hali mount qilinmaganini aytadi. Bu stale bo‘lishi mumkin: main.py/BFF/router va UI’ni amalda trace qiling, docdagi implemented so‘ziga qarab tugadi demang.
Oxirgi ma’lum PostgreSQL gate: test_05_atomic_username_throttle_and_restart FAILED,9passed6warnings. Yakuniy muvaffaqiyatli qayta test ota agentga kelmagan. Root cause va xavfsizlik regressiyasini tekshiring; testni skip/zaiflashtirib yashirmang.
To‘xtaganda full pytest va Codex business implementation jarayonlari majburan tugatilgan; qisman yozilgan fayllar bo‘lishi mumkin.

## 8. Foydalanuvchi tasdiqlagan biznes qoidalari
1.Admin grant — BUTUN KATALOGGA UMRBOD kirish; mavjud pullik/per-section huquqlarni avtomatik bekor qilmaslik.
2.Resolve discrepancy — tekshiruv/case’ni izoh bilan yopish xolos. Payment status/timestamps/access o‘zgarmaydi.
3.Learning intervention — ichki admin eslatmasi va kuzatuv vazifasi. O‘quvchiga xabar/Telegram yuborilmaydi.
Hujjatlar: backend docs/ADMIN_BUSINESS_DECISIONS.md va ADMIN_BUSINESS_IMPLEMENTATION.md. Amaliy to‘liq integratsiya hali tasdiqlanmagan.

## 9. Lokal preview
Oxirgi tasdiqlangan latest link https://localhost:3444 — isolated production Next3101 -> FastAPI8124 -> disposable SQLite. Oldingi3443 yopilgan bo‘lishi mumkin. Hozir ishga tushgan deb taxmin qilmang, port/HTTPni tekshiring.
Parent handoff process: proc_8b2969a6f440 (boshqa sessionda handle ishlamasligi mumkin).
Runner: `PENCIL_KEEP_PREVIEW=1 PENCIL_TEST_SCRIPT=tests/operations-browser.mjs node work/pencil-isolated-run.mjs`.
Runner isolated work/pencil/verification-site buildidan foydalanadi; root .next avtomatik eng so‘nggi preview degani emas. Faylni o‘qib prerequisite/copy/build/portsni tekshiring. Faqat o‘zingizga tegishli jarayonlarni to‘xtating.
Test account vaqtinchalik fixture’da, production login emas. TLS key/cert’ni Gitga yubormang. Public internetga test account bilan expose qilmang.

## 10. Davom ettirish tartibi
1.Ikkala repo git status/diff va instructionsni tekshirish; untracked o‘zgarishlarni yo‘qotmaslik.
2.To‘xtatilgan content/business/reporting/notification ishlarini source va router/BFF/UI bo‘ylab trace qilish.
3.PostgreSQL throttle failure va migration chainni to‘g‘rilab targeted+full testlarni bajarish.
4.Frontend npm test, npm run lint, npm run build; backend pytest’ni deployment .envsiz izolyatsiyalash.
5.Disposable PostgreSQL opt-in gate: `LEAP_TEST_DISPOSABLE_POSTGRES=1 .venv/Scripts/python.exe -m pytest tests/test_admin_postgres.py -o addopts='' -v -s` (apps/api ichida; Docker kerak).
6.Haqiqiy HTTPS/BFF/FastAPI/disposable DB bilan create/edit/import/publish/access/case/followup readback,permission,CSRF,conflict,rollback va regressiyalarni sinash.
7.Actual Pen15board36card acceptance matrix’ni yangilash. Hozirgi matrix oxirgi ishlardan ORTDA QOLGAN va biznes savollari allaqachon javoblangan.
8.Lokal preview yangilash va foydalanuvchi UI/UX tasdig‘ini olish.
9.Shundan so‘ng alohida commit/push/deploy ruxsati; backup,production config va migration gate bilan ehtiyotkor deploy.

## 11. Muhim hujjatlar va dalillar
Frontend: docs/pencil-full-audit.md,pencil-frontend-implementation.md,admin-acceptance-matrix.md(+JSON),admin-operations-implementation.md,design-restoration.md.
Backend: docs/ADMIN_BACKEND.md,ADMIN_OPERATIONS.md,ADMIN_BUSINESS_DECISIONS.md,ADMIN_BUSINESS_IMPLEMENTATION.md; docs/decisions/002-admin-panel-architecture.md.
README ilk read-only slice’ga oid, yangi endpointlar/dizayn bo‘yicha eskirgan; source bilan tekshirmasdan authoritative latest scope deb qabul qilmang.
Screenshots/loglar: work/pencil/{full,updated-runtime,operations-runtime}/; operations-verification.log; boshqa work runner/audit fayllar Gitignored bo‘lishi mumkin. Yangi joyga ko‘chirishda kerakli reference PNG/JSON/test runnerlarni alohida ko‘chiring, secret/key/db’larni emas.

## 12. Tugallanish bahosi
Oldingi taxmin35%tayyor/65%qolgan faqat eski36state-card ro‘yxati (9verified,7partial,20other;partialga0.5vazn) asosida edi. Bu vaqt/mehnat foizi yoki hozirgi source completeness emas. Oxirgi qisman yozilgan ishlar tekshirilmagani sabab aniq yangilangan foiz berib bo‘lmaydi. 1:1 va release-ready deb tasdiqlanmagan.
