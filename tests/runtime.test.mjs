import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('fresh workspaces open in the PushDay light palette without discarding saved themes',()=>{
 const provider=read('app/theme-provider.tsx');
 assert.match(provider,/defaultTheme="light"/);
 assert.match(provider,/storageKey="leap-theme"/);
 assert.match(provider,/enableSystem=\{false\}/);
});
test('production graph uses Next, guarded pages and read-only frontend',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.scripts.build,'next build');assert.equal(pkg.scripts.start,'next start');
 assert.match(read('app/page.tsx'),/requireAdminSession/);
 assert.match(read('app/page.tsx'),/AdminApp/);
 assert.match(read('lib/admin-server.ts'),/import 'server-only'/);
 assert.match(read('lib/admin-bff.mjs'),/import 'server-only'/);
 const ui=read('app/admin-app.tsx');assert.doesNotMatch(ui,/seedData|exportCsv|mutate\(/);
 // Device preferences are allowed; identities, auth and observations never persist here.
 const storageCalls=[...ui.matchAll(/localStorage\.(getItem|setItem)\((['"])([^'"]+)\2/g)];
 assert.equal(storageCalls.length,2);assert.ok(storageCalls.every(m=>m[3]==='leap-auto-refresh'));
 assert.match(ui,/PushdayNavigation/);assert.match(ui,/pd-metric-grid/);assert.match(ui,/telegramUserId/);assert.match(ui,/hasMore/);
 assert.doesNotMatch(ui,/data-pencil|design-screen|adaptDesign|pencil-/);
 assert.ok(existsSync(new URL('../app/login/page.tsx',import.meta.url)));
 assert.doesNotMatch(read('app/api/admin/route.ts'),/cloudflare|seedData|oai/);
});
