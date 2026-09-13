import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const original=JSON.parse(read('archive/legacy/app/design.json'));
const signature=n=>typeof n==='string'?'TEXT':{tag:n.tag,attrs:n.attrs,children:n.children.map(signature)};
test('six original route trees and every card/nav class survive audited data adaptation',async()=>{
 assert.ok(existsSync(new URL('../lib/design-adapter.mjs',import.meta.url)),'Original design adapter must exist, not a replacement admin-shell');
 const {adaptDesign,routes}=await import('../lib/design-adapter.mjs');
 assert.equal(Object.keys(routes).length,6);
 for(const key of Object.values(routes))assert.deepEqual(signature(adaptDesign(original[key])),signature(original[key]));
 assert.match(read('app/leap.tsx'),/adaptDesign/);
 assert.doesNotMatch(read('app/leap.tsx'),/admin-shell/);
 assert.equal(read('archive/legacy/app/design.json'),execFileSync('git',['show','183af91:app/design.json'],{encoding:'utf8'}));
});
test('unavailable metrics, identities and status cannot leak from the archive',async()=>{
 const {adaptDesign,indexDesign}=await import('../lib/design-adapter.mjs');
 for(const [key,names] of Object.entries({bi8Au:['Active Learners Value','Lessons Completed Value','Live Activity Label'],uYGzD:['Madina Karimova Payment Status Label'],nqETx:['Payment confirmed Event Badge Label','Selected Message Title'],DUfwI:['Lesson Draft Badge Label','Foundation Catalog Name']})){
  const nodes=indexDesign(adaptDesign(original[key]));
  for(const name of names)assert.deepEqual(nodes[name].children,['—'],name);
 }
 const altered={tag:'div',attrs:{'data-pencil-name':'Injected Value'},children:['Paid','Fake learner', '999']};
 assert.deepEqual(adaptDesign(altered).children,['—','—','—']);
});
test('disabled date selectors retain their original preset labels',async()=>{
 const {adaptDesign,indexDesign}=await import('../lib/design-adapter.mjs');
 assert.deepEqual(indexDesign(adaptDesign(original.bi8Au))['Date Range Label'].children,['Last 30 days']);
 assert.deepEqual(indexDesign(adaptDesign(original.KNuM1))['Learning Date Label'].children,['Last 7 days']);
});
test('commerce detail labels remain labels, not unavailable data values',async()=>{
 const {adaptDesign,indexDesign}=await import('../lib/design-adapter.mjs');
 const nodes=indexDesign(adaptDesign(original.uYGzD));
 for(const [name,value] of Object.entries({'Registered Commerce Fact Label':'REGISTERED','Orders Commerce Fact Label':'ORDERS','Total Commerce Fact Label':'TOTAL','Open Learner Profile Label':'Profil','Copy Payment IDs Label':'Copy IDs','Payment Access Timeline Title':'Payment → access timeline'}))assert.deepEqual(nodes[name].children,[value]);
});
