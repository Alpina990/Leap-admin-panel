import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('production graph uses Next, guarded pages and read-only frontend',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.scripts.build,'next build');assert.equal(pkg.scripts.start,'next start');
 assert.match(read('app/page.tsx'),/requireAdminSession/);
 assert.match(read('lib/admin-server.ts'),/import 'server-only'/);
 assert.match(read('lib/admin-bff.mjs'),/import 'server-only'/);
 const ui=read('app/leap.tsx');assert.doesNotMatch(ui,/seedData|design\.json|exportCsv|mutate\(|localStorage/);
 assert.match(ui,/Unavailable/);assert.match(ui,/telegramUserId/);assert.match(ui,/hasMore/);assert.match(ui,/exact/);
 assert.ok(existsSync(new URL('../app/login/page.tsx',import.meta.url)));
 assert.doesNotMatch(read('app/api/admin/route.ts'),/cloudflare|seedData|oai/);
});
