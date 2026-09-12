import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8123',origin:'https://admin.leapeng.uz'};
const session={admin:{id:1,username:'operator'},csrfToken:'a'.repeat(64)};
const cookie='__Host-leap_admin='+'a'.repeat(43)+'; HttpOnly; Max-Age=28800; Path=/; SameSite=strict; Secure';
const login=(headers={},body=JSON.stringify({username:'operator',password:'disposable-password'}))=>new Request(config.origin+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:config.origin,'X-Admin-CSRF':'login',...headers},body});
const get=(path='overview',extra={})=>new Request(config.origin+'/api/admin/'+path,{headers:{cookie:'other=bad; '+cookie.split(';')[0],'oai-user-id':'root',...extra}});

test('login matches backend input bounds, and oversized/500 responses reveal no upstream body',async()=>{
 const denied={error:{code:'admin_unauthorized',message:'Invalid credentials'}};
 assert.equal((await proxyAdmin(login({},JSON.stringify({username:'operator',password:'wrong'})),'login',config,async()=>Response.json(denied,{status:401}))).status,401);
 for(const upstream of [new Response('SECRET INTERNAL TRACE',{status:500}),new Response('x'.repeat(262145),{headers:{'Content-Type':'application/json'}})]){
  const response=await proxyAdmin(get(),'overview',config,async()=>upstream);
  assert.equal(response.status,502);assert.equal(response.headers.get('cache-control'),'no-store');assert.doesNotMatch(await response.text(),/SECRET|TRACE|xxxx/);
 }
});

test('stalled request bodies are bounded by a deadline', {timeout:10000},async()=>{
 const request=new Request(config.origin+'/api/admin/login',{method:'POST',headers:{Origin:config.origin,'X-Admin-CSRF':'login','Content-Type':'application/json'},body:new ReadableStream({start(){}}),duplex:'half'});
 const response=await proxyAdmin(request,'login',config);
 assert.equal(response.status,408);assert.equal(response.headers.get('cache-control'),'no-store');
});

test('read-only allowlist validates DTOs and exact query, filters identity headers',async()=>{
 const directory={items:[{telegramUserId:'9223372036854775807',username:'Ab_C',firstName:null,lastName:null,languageCode:null,createdAt:'2026-01-01T00:00:00+00:00',lastSeenAt:'2026-01-01T00:00:00+00:00'}],total:41,limit:25,offset:0,hasMore:true};
 const res=await proxyAdmin(get('learners?username=Ab_C&limit=25&offset=0'),'learners',config,async(url,init)=>{assert.equal(url,config.api+'/api/v1/admin/learners?username=Ab_C&limit=25&offset=0');assert.deepEqual([...init.headers.keys()],['cookie']);return Response.json(directory);});
 assert.equal(res.status,200);assert.deepEqual(await res.json(),directory);
 for(const query of ['?url=http://evil','?limit=101','?limit=1&limit=2','?offset=-1','?username='])assert.equal((await proxyAdmin(get('learners'+query),'learners',config)).status,422);
 for(const action of ['../session','http://evil','note'])assert.equal((await proxyAdmin(get(),action,config)).status,404);
 assert.equal((await proxyAdmin(login(),'overview',config)).status,405);
 const invalid={...directory,items:[{...directory.items[0],telegramUserId:123}]};
 assert.equal((await proxyAdmin(get('learners'),'learners',config,async()=>Response.json(invalid))).status,502);
 assert.equal((await proxyAdmin(get(),'overview',config,async()=>new Response(null,{status:302,headers:{location:'http://evil'}}))).status,502);
 assert.equal((await proxyAdmin(get(),'overview',config,async()=>Response.json({learnersTotal:3,coursesTotal:1,sectionsTotal:2,lessonsTotal:9}))).status,200);
 assert.equal((await proxyAdmin(get('session'),'session',config,async()=>Response.json(session))).status,200);
});

test('configuration, cookies, upstream failures and logout fail closed',async()=>{
 for(const api of ['http://upstream/path','https://user:pass@upstream','file:///secret','http://upstream?url=evil'])assert.equal((await proxyAdmin(get(),'overview',{...config,api})).status,503);
 assert.equal((await proxyAdmin(login(),'login',{...config,origin:'http://localhost'})).status,503);
 for(const value of [cookie+'; Domain=admin.leapeng.uz',cookie.replace('; Secure',''),cookie+', other=bad']) assert.equal((await proxyAdmin(login(),'login',config,async()=>Response.json(session,{headers:{'Set-Cookie':value}}))).status,502);
 const unauthorized={error:{code:'admin_unauthorized',message:'Invalid administrator credentials.'}};
 assert.equal((await proxyAdmin(login(),'login',config,async()=>Response.json(unauthorized,{status:401}))).status,401);
 const logout=new Request(config.origin+'/api/admin/logout',{method:'POST',headers:{cookie:cookie.split(';')[0],Origin:config.origin,'X-Admin-CSRF':session.csrfToken}});
 const deleted='__Host-leap_admin=""; expires=Sat, 12 Sep 2026 00:00:00 GMT; HttpOnly; Max-Age=0; Path=/; SameSite=strict; Secure';
 const res=await proxyAdmin(logout,'logout',config,async(url,init)=>{assert.equal(init.headers.get('origin'),config.origin);assert.equal(init.headers.get('x-admin-csrf'),session.csrfToken);return new Response(null,{status:204,headers:{'Set-Cookie':deleted}});});
 assert.equal(res.status,204);assert.equal(res.headers.get('set-cookie'),deleted);
});

test('login preserves actual Origin and narrow cookie, denies invalid input',async()=>{
 let calls=0;
 const upstream=async(url,init)=>{calls++;assert.equal(url,'http://127.0.0.1:8123/api/v1/admin/login');assert.equal(init.redirect,'error');assert.deepEqual([...init.headers.keys()].sort(),['content-type','origin','x-admin-csrf']);return Response.json(session,{headers:{'Set-Cookie':cookie}});};
 const result=await proxyAdmin(login({'oai-user-id':'root',authorization:'bad',cookie:'other=secret'}),'login',config,upstream);
 assert.equal(result.status,200);assert.deepEqual(await result.json(),session);assert.equal(result.headers.get('set-cookie'),cookie);
 for(const origin of ['', 'null','https://evil.example']) assert.equal((await proxyAdmin(login({Origin:origin}),'login',config,upstream)).status,403);
 assert.equal((await proxyAdmin(login({},'x'.repeat(8193)),'login',config,upstream)).status,413);
 assert.equal((await proxyAdmin(login({},'{bad'),'login',config,upstream)).status,422);
 assert.equal(calls,1);
});

test('missing session and spoofed identity never reach upstream', async () => {
  const { proxyAdmin } = await import('../lib/admin-bff.mjs');
  let calls = 0;
  const response = await proxyAdmin(new Request('https://admin.leapeng.uz/api/admin/overview', {headers:{'oai-user-id':'owner'}}), 'overview', {api:'http://127.0.0.1:8123',origin:'https://admin.leapeng.uz'}, async () => {calls++;});
  assert.equal(response.status,401);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(calls,0);
});
