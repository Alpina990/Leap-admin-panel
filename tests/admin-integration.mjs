// Real Next BFF -> FastAPI -> disposable DB. Explicitly trust only the fixture
// certificate while retaining TLS hostname verification. Never a production run.
import https from 'node:https';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin='https://localhost:3446';
const agent=new https.Agent({ca:readFileSync('work/smoke/cert.pem')});
let cookie,csrf;
function call(path,body,extra={}){return new Promise((resolve,reject)=>{const request=https.request(origin+'/api/admin/'+path,{agent,method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin,'X-Admin-CSRF':csrf??'login'}:{}),...extra}},response=>{let raw='';response.on('data',v=>raw+=v);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,data:raw?JSON.parse(raw):null}));});request.on('error',reject);request.setTimeout(12000,()=>request.destroy(new Error('timeout')));request.end(body?JSON.stringify(body):undefined);});}
assert.equal((await call('analytics-summary')).status,401);
let result=await call('login',{username:'smoke_operator',password:'disposable-test-only-password-92!'});assert.equal(result.status,200);
cookie=result.headers['set-cookie'][0].split(';')[0];csrf=result.data.csrfToken;
for(const path of ['analytics-summary','analytics-learning','analytics-learner?learnerId=1','content-catalog','business-state?learnerId=1','business-cases']){result=await call(path);assert.equal(result.status,200,path+': '+JSON.stringify(result.data));assert.equal(result.headers['cache-control'],'no-store');}
let grant={learnerId:'1',baseVersion:0,reason:'Disposable integration check for catalog lifetime access.',requestId:randomUUID()};
result=await call('business-grant',grant,{'X-Admin-CSRF':'wrong'});assert.equal(result.status,403);
result=await call('business-grant',grant);assert.equal(result.status,200,JSON.stringify(result.data));const saved=result.data;
assert.deepEqual((await call('business-grant',grant)).data,saved);
assert.equal((await call('business-grant',{...grant,requestId:randomUUID()})).status,409);
assert.equal((await call('analytics-learner?learnerId=1')).data.catalogAccess,true);
let cases=(await call('business-cases')).data;assert.ok(cases.items.length);
const selected=cases.items[0],before=(await call('payment?orderId='+selected.orderId)).data;
const close={caseId:selected.id,baseVersion:selected.version,note:'Disposable evidence review closes case without changing payment.',requestId:randomUUID()};
result=await call('business-close',close);assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.status,'closed');
assert.deepEqual((await call('payment?orderId='+selected.orderId)).data,before);
const intervention={learnerId:'1',baseVersion:0,reason:'Disposable internal follow-up on the learner progress.',taskTitle:'Review lesson progress',requestId:randomUUID(),dueAt:null};
result=await call('business-intervention',intervention);assert.equal(result.status,200,JSON.stringify(result.data));
assert.deepEqual((await call('business-intervention',intervention)).data,result.data);
assert.equal((await call('business-state?learnerId=1')).data.followUpTasks.length,1);
console.log('PASS real HTTPS BFF/API: authenticated analytics, CSRF denial, lifetime grant and replay/conflict, unchanged payment after case closure, idempotent internal follow-up.');
agent.destroy();
