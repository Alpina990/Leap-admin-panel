import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('refresh retains only same-query data and clears identities when the query changes',async()=>{
 assert.ok(existsSync('lib/read-state.mjs'),'missing query-safe refresh state');
 const {readState}=await import('../lib/read-state.mjs');
 const previous={key:'/learners:0',path:'/learners',data:{items:['a']},syncedAt:'observed'};
 assert.equal(readState(previous,'/learners',1).data,previous.data);
 assert.equal(readState(previous,'/learners',1).loading,true);
 assert.equal(readState(previous,'/learners?username=b',1).data,undefined);
 assert.equal(readState(previous,null,1).data,undefined);
});
test('sign in uses the Pencil card with bottom actions',()=>{
 assert.match(readFileSync('app/login/sign-in.tsx','utf8'),/pencil-dialog-actions/);
});
test('Pencil dark-allocation labels and filter surfaces use observed light colors',()=>{
 const css=readFileSync('app/appearance.css','utf8');
 assert.match(css,/--quiet: #ddd8f1/);assert.doesNotMatch(css,/--quiet: #b8b6ce/);
 assert.doesNotMatch(css,/background: #f3f0fa/);
});
test('canonical Pencil navigation is reused instead of route-specific utilities',()=>{
 assert.ok(existsSync('app/pencil-navigation.tsx'),'missing canonical navigation');
 assert.match(readFileSync('app/leap.tsx','utf8'),/<PencilNavigation/);
});
test('unsupported Pencil workflows preserve field shells but never sample values or success states',()=>{
 assert.ok(existsSync('lib/pencil-dialogs.json'),'missing safe workflow shells');
 const cards=JSON.parse(readFileSync('lib/pencil-dialogs.json','utf8'));
 assert.ok(cards['Date range']);assert.ok(cards['Manage access']);assert.ok(cards['Create lesson']);
 assert.equal(cards['Changes saved'],undefined);assert.equal(cards['Ready to publish'],undefined);
 assert.doesNotMatch(JSON.stringify(cards),/Madina|1,200,000|pay_01|34 \/ 50/);
});
test('shared search has its own read-only result state and Pencil dialog fields',()=>{
 const ui=readFileSync('app/leap.tsx','utf8');
 assert.match(ui,/globalQuery/);
 assert.match(ui,/Orders and messages are unavailable/);
 assert.match(ui,/Automatic refresh/);
 assert.match(ui,/Access \/ activity/);
});
