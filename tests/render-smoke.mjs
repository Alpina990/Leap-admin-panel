import https from 'node:https';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://localhost:3446';
const agent=new https.Agent({ca:readFileSync('work/smoke/cert.pem')});
function request(path,body,cookie){return new Promise((resolve,reject)=>{const r=https.request(origin+path,{agent,method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{Origin:origin,'Content-Type':'application/json','X-Admin-CSRF':'login'}:{})}},response=>{let text='';response.on('data',c=>text+=c);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,text}));});r.on('error',reject);r.setTimeout(12000,()=>r.destroy(new Error('timeout')));r.end(body?JSON.stringify(body):undefined);});}
try{
 const login=await request('/api/admin/login',{username:'smoke_operator',password:'disposable-test-only-password-92!'});
 assert.equal(login.status,200,'Disposable test sign-in');
 const cookie=login.headers['set-cookie'][0].split(';')[0];
 const page=await request('/',null,cookie);
 assert.equal(page.status,200,'Authenticated dashboard SSR must succeed');
 assert.match(page.text,/Operations overview/);
 assert.doesNotMatch(page.text,/Too many re-renders|Administrator service unavailable|NEXT_HTTP_ERROR_FALLBACK/);
 console.log('PASS authenticated production dashboard renders without state-update loop.');
}finally{agent.destroy();}
