import assert from 'node:assert/strict';
const base='http://localhost:5173';
const auth=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
assert.equal(auth.status,302);
const cookie=auth.headers.get('set-cookie').split(';')[0];
const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json'};
async function get(){const res=await fetch(base+'/api/admin',{headers});assert.equal(res.status,200);return res.json();}
async function post(revision,command,origin=base){const res=await fetch(base+'/api/admin',{method:'POST',headers:{...headers,Origin:origin},body:JSON.stringify({revision,command})});const raw=await res.text(); let body; try{body=JSON.parse(raw);}catch{body={error:raw};} return {status:res.status,body};}
assert.equal((await fetch(base+'/api/admin')).status,403,'anonymous access rejected');
const initial=await get();assert.equal(initial.data.learners.length,289);
assert.equal((await post(initial.revision,{action:'note',learnerId:'lr_1',text:'test'},'https://invalid.example')).status,403,'cross-origin writes rejected');
assert.equal((await post(initial.revision,{action:'access',learnerId:'lr_1',access:'No access',reason:'x',confirmed:true})).status,400,'access requires a meaningful reason');
let result=await post(initial.revision,{action:'note',learnerId:'lr_2',text:'API verification: persistent note.'});assert.equal(result.status,200);assert.equal((await get()).data.learners[1].notes.at(-1).text,'API verification: persistent note.');
assert.equal((await post(initial.revision,{action:'note',learnerId:'lr_2',text:'Should conflict'})).status,409,'stale update conflicts');
let current=await get();const draft={...current.data.lessons[0],id:'qa-validation-lesson',title:'QA validation lesson',passScore:0,status:'Draft'};
result=await post(current.revision,{action:'saveLesson',lesson:draft});assert.equal(result.status,200);current=result.body;
assert.equal((await post(current.revision,{action:'publish',lessonId:draft.id})).status,422,'invalid quiz blocks publication');
result=await post(current.revision,{action:'saveLesson',lesson:{...draft,passScore:70}});assert.equal(result.status,200);current=result.body;
result=await post(current.revision,{action:'publish',lessonId:draft.id});assert.equal(result.status,200);assert.equal(result.body.data.lessons.find(l=>l.id===draft.id).status,'Published');current=result.body;
result=await post(current.revision,{action:'resolveCase',caseId:'case_1',reason:'Verified matching paid order and missing access in the sample workspace.',confirmed:true});assert.equal(result.status,200);assert.equal(result.body.data.learners.find(l=>l.id==='lr_10').access,'Lifetime');assert.equal(result.body.data.cases[0].resolved,true);
assert.ok(result.body.data.audit.some(a=>a.action==='resolveCase'&&a.reason));
console.log('PASS: authentication, CSRF, validation, persistent notes, conflict protection, quiz publication guard, publication, reconciliation and audit history.');

