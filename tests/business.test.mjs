import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8125',origin:'https://localhost:3445'};
const cookie='__Host-leap_admin='+'a'.repeat(43),requestId='12345678-1234-1234-1234-123456789012',reason='A documented learner support decision.';
const permissions={canGrantCatalogAccess:true,canCloseReconciliation:true,canCreateIntervention:true,canWithdrawRevenue:true};
const grant={learnerId:'123',scope:'whole_catalog',source:'admin_lifetime',reason,version:1,grantedAt:'2026-09-13T10:00:00Z',expiresAt:'2027-09-13T10:00:00Z',revokedAt:null,accessState:'lifetime',accessOverride:false,preservedSectionEntitlements:['paid-section']};
function request(action,body,headers={}){return new Request(config.origin+'/api/admin/'+action,{method:body?'POST':'GET',headers:{cookie,...(body?{Origin:config.origin,'X-Admin-CSRF':'csrf','Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
test('business grant refuses legacy access-only writes without transaction metadata',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason};
 let fetched=0;
 const response=await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>{fetched++;return Response.json(grant);});
 assert.equal(response.status,422);assert.equal(fetched,0);
});
test('business grant records CRM transaction metadata and optional receipt before granting access',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,amountTiyin:'88000000',provider:'card_transfer',paidAt:'2026-10-14T13:55:51Z',crmReference:'beecrm-payment-29631',receipt:{filename:'receipt.pdf',contentType:'application/pdf',base64:'JVBERi0xLjcKJSVFT0Y='}};
 const result={transaction:{id:'20000000-0000-4000-8000-000000000001',learnerId:'123',amountTiyin:'88000000',currency:'UZS',method:'card_transfer',paidAt:body.paidAt,crmReference:body.crmReference,receiptAvailable:true,receiptFilename:'receipt.pdf',receiptContentType:'application/pdf',receiptSha256:'d5db70fbccdd8ccc6a553604b79a09cd33083b401340d546efa08a52142c972e',version:1,deletedAt:null},catalogGrant:{learnerId:'123',scope:'whole_catalog',source:'admin_crm',reason,version:1,grantedAt:body.paidAt,expiresAt:'2027-10-14T13:55:51Z',revokedAt:null},accessState:'lifetime',accessOverride:false};
 const response=await proxyAdmin(request('business-grant',body),'business-grant',config,async(url,options)=>{assert.equal(url,config.api+'/api/v1/admin/business/catalog-sales');assert.deepEqual(JSON.parse(options.body),body);return Response.json(result);});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),result);
 for(const wrong of [{receiptFilename:'other.pdf'},{receiptContentType:'image/png'},{receiptSha256:'b'.repeat(64)}]){
  const rejected=await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json({...result,transaction:{...result.transaction,...wrong}}));
  assert.equal(rejected.status,502,JSON.stringify(wrong));
 }
});
test('business grant decodes receipt bytes, enforces 2 MiB, and matches declared file type magic',async()=>{
 const base={requestId,learnerId:'123',baseVersion:0,reason,amountTiyin:'88000000',provider:'card_transfer',paidAt:'2026-10-14T13:55:51Z',crmReference:null};
 const valid=[
  ['application/pdf',Buffer.from('%PDF-1.7\n').toString('base64')],
  ['image/jpeg',Buffer.from([0xff,0xd8,0xff,0xe0,0x00]).toString('base64')],
  ['image/png',Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).toString('base64')],
 ];
 for(const [contentType,base64] of valid){let called=0;await proxyAdmin(request('business-grant',{...base,receipt:{filename:'receipt.bin',contentType,base64}}),'business-grant',config,async()=>{called++;throw Error('validated');});assert.equal(called,1,contentType);}
 const invalid=[
  {filename:'receipt.pdf',contentType:'application/pdf',base64:Buffer.from('not a pdf').toString('base64')},
  {filename:'receipt.jpg',contentType:'image/jpeg',base64:valid[2][1]},
  {filename:'receipt.png',contentType:'image/png',base64:valid[0][1]},
  {filename:'receipt.pdf',contentType:'application/pdf',base64:'AAAA==='},
  {filename:'receipt.pdf',contentType:'application/pdf',base64:Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(2*1024*1024-4)]).toString('base64')},
 ];
 for(const receipt of invalid){let called=0;const response=await proxyAdmin(request('business-grant',{...base,receipt}),'business-grant',config,async()=>{called++;return Response.json({});});assert.equal(response.status,422,receipt.contentType);assert.equal(called,0);}
});
test('business grant binds audited transaction instant, receipt presence, initial version and active state',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,amountTiyin:'88000000',provider:'card_transfer',paidAt:'2026-10-14T13:55:51Z',crmReference:null,receipt:null};
 const transaction={id:'20000000-0000-4000-8000-000000000001',learnerId:'123',amountTiyin:body.amountTiyin,currency:'UZS',method:body.provider,paidAt:'2026-10-14T18:55:51+05:00',crmReference:null,receiptAvailable:false,receiptFilename:null,receiptContentType:null,receiptSha256:null,version:1,deletedAt:null};
 const result={transaction,catalogGrant:{learnerId:'123',scope:'whole_catalog',source:'admin_crm',reason,version:1,grantedAt:body.paidAt,expiresAt:'2027-10-14T13:55:51Z',revokedAt:null},accessState:'lifetime',accessOverride:false};
 assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json(result))).status,200);
 for(const wrong of [{paidAt:'2026-10-14T13:55:52Z'},{receiptAvailable:true},{version:2},{deletedAt:'2026-10-15T00:00:00Z'}])assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json({...result,transaction:{...transaction,...wrong}}))).status,502,JSON.stringify(wrong));
 for(const wrong of [{source:'admin_lifetime'},{grantedAt:'2026-10-14T13:55:52Z'},{expiresAt:null},{expiresAt:'2027-10-14T13:55:52Z'}])assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json({...result,catalogGrant:{...result.catalogGrant,...wrong}}))).status,502,JSON.stringify(wrong));
});
test('business grant validates leap-day annual expiry using the backend calendar clamp',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,amountTiyin:'88000000',provider:'card_transfer',paidAt:'2024-02-29T13:55:51Z',crmReference:null,receipt:null};
 const result={transaction:{id:'20000000-0000-4000-8000-000000000001',learnerId:'123',amountTiyin:body.amountTiyin,currency:'UZS',method:body.provider,paidAt:body.paidAt,crmReference:null,receiptAvailable:false,receiptFilename:null,receiptContentType:null,receiptSha256:null,version:1,deletedAt:null},catalogGrant:{learnerId:'123',scope:'whole_catalog',source:'admin_crm',reason,version:1,grantedAt:body.paidAt,expiresAt:'2025-02-28T13:55:51Z',revokedAt:null},accessState:'lifetime',accessOverride:false};
 assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json(result))).status,200);
 assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json({...result,catalogGrant:{...result.catalogGrant,expiresAt:'2025-03-01T13:55:51Z'}}))).status,502);
});
test('business grant rejects a future paid instant before contacting upstream',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,amountTiyin:'88000000',provider:'card_transfer',paidAt:'2999-10-14T13:55:51Z',crmReference:null,receipt:null};
 let called=0;const response=await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>{called++;return Response.json({});});
 assert.equal(response.status,422);assert.equal(called,0);
});
test('manual transaction deletion uses a fixed UUID path and validates the audited result',async()=>{
 const body={requestId,transactionId:'20000000-0000-4000-8000-000000000001',baseVersion:1,reason,password:'current-password'};
 const result={transactionId:body.transactionId,deletedAt:'2026-10-15T10:00:00Z',version:2,accessUnchanged:true};
 const response=await proxyAdmin(request('business-delete-transaction',body),'business-delete-transaction',config,async(url,options)=>{assert.equal(url,config.api+'/api/v1/admin/business/manual-transactions/'+body.transactionId+'/delete');assert.deepEqual(JSON.parse(options.body),body);return Response.json(result);});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),result);
});
test('business writes deny invalid input, path injection, missing CSRF and undocumented operations before fetch',async()=>{
 let fetched=0;const fetcher=async()=>{fetched++;return Response.json(grant);};
 const valid={requestId,learnerId:'123',baseVersion:0,reason};
 for(const body of [{...valid,scope:'section'},{...valid,reason:'short'},{...valid,learnerId:'9223372036854775808'},{...valid,baseVersion:-1},{...valid,requestId:'bad'}])assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,fetcher)).status,422);
 assert.equal((await proxyAdmin(request('business-close',{requestId,caseId:'../logout',baseVersion:0,note:reason}),'business-close',config,fetcher)).status,422);
 assert.equal((await proxyAdmin(request('business-grant',valid,{'X-Admin-CSRF':''}),'business-grant',config,fetcher)).status,403);
 assert.equal((await proxyAdmin(request('business-refund',valid),'business-refund',config,fetcher)).status,404);assert.equal(fetched,0);
});
test('learner state and paginated cases reject mismatched identity and page responses',async()=>{
 const state={learnerId:'123',catalogGrant:null,accessState:'no_access',accessVersion:0,accessOverride:false,followUpVersion:0,permissions,followUpTasks:[]};
 assert.equal((await proxyAdmin(request('business-state?learnerId=123'),'business-state',config,async()=>Response.json(state))).status,200);
 const catalogGrant={learnerId:'123',scope:'whole_catalog',source:'admin_lifetime',reason,version:1,grantedAt:grant.grantedAt,expiresAt:grant.expiresAt,revokedAt:null};
 assert.equal((await proxyAdmin(request('business-state?learnerId=123'),'business-state',config,async()=>Response.json({...state,catalogGrant,accessState:'lifetime',accessVersion:1}))).status,200);
 assert.equal((await proxyAdmin(request('business-state?learnerId=999'),'business-state',config,async()=>Response.json(state))).status,502);
 assert.equal((await proxyAdmin(request('business-state'),'business-state',config)).status,422);
 assert.equal((await proxyAdmin(request('business-permissions'),'business-permissions',config,async()=>Response.json(permissions))).status,200);
 const page={items:[],total:0,limit:25,offset:0,hasMore:false};
 assert.equal((await proxyAdmin(request('business-cases?offset=25'),'business-cases',config,async()=>Response.json(page))).status,502);
});
test('case closure and intervention enforce semantic response identity and propagate permission/conflict',async()=>{
 const closure={requestId,caseId:'case-1',baseVersion:0,note:reason};
 const item={id:'case-1',learnerId:'123',orderId:null,status:'closed',issue:'Discrepancy',closureNote:reason,version:1,createdAt:grant.grantedAt,closedAt:grant.grantedAt};
 assert.equal((await proxyAdmin(request('business-close',closure),'business-close',config,async url=>{assert.equal(url,config.api+'/api/v1/admin/business/reconciliation-cases/case-1/close');return Response.json(item);})).status,200);
 const body={requestId,learnerId:'123',baseVersion:0,reason,taskTitle:'Review learner',dueAt:null};
 const result={note:{id:requestId,learnerId:'123',actor:'admin',note:'Intervention: '+reason},task:{id:requestId,learnerId:'123',title:body.taskTitle,status:'open',reason,dueAt:null,version:1}};
 assert.equal((await proxyAdmin(request('business-intervention',body),'business-intervention',config,async()=>Response.json(result))).status,200);
 assert.equal((await proxyAdmin(request('business-intervention',body),'business-intervention',config,async()=>Response.json({...result,task:{...result.task,learnerId:'999'}}))).status,502);
 for(const [status,code] of [[403,'admin_forbidden'],[409,'admin_conflict']]){const response=await proxyAdmin(request('business-close',closure),'business-close',config,async()=>Response.json({error:{code,message:'Internal detail'}},{status}));assert.equal(response.status,status);assert.equal((await response.json()).error.code,code);}
});

test('revocation errors sanitize reauthentication without turning it into session loss',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,password:'fixture-secret-only'};
 for(const [status,code] of [[401,'admin_reauthentication_failed'],[401,'admin_unauthorized'],[403,'admin_forbidden'],[409,'admin_conflict'],[422,'admin_validation'],[429,'admin_rate_limited'],[500,'admin_internal_error']]){
 const response=await proxyAdmin(request('business-revoke',body),'business-revoke',config,async()=>Response.json({error:{code,message:body.password}},{status}));
 assert.equal(response.status,status===500?502:status);const data=await response.json();if(status!==500)assert.equal(data.error.code,code);assert.ok(!JSON.stringify(data).includes(body.password));}
});
test('transaction deletion sanitizes reauthentication failure without turning it into session loss',async()=>{
 const body={requestId,transactionId:'20000000-0000-4000-8000-000000000001',baseVersion:1,reason,password:'fixture-secret-only'};
 const response=await proxyAdmin(request('business-delete-transaction',body),'business-delete-transaction',config,async()=>Response.json({error:{code:'admin_reauthentication_failed',message:body.password}},{status:401}));
 assert.equal(response.status,401);const data=await response.json();assert.equal(data.error.code,'admin_reauthentication_failed');assert.ok(!JSON.stringify(data).includes(body.password));
});
test('revocation forwards only its strict secret-bearing DTO and verifies denial identity',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason,password:'fixture-secret-only'};
 const catalog={...grant};delete catalog.preservedSectionEntitlements;
 const denial={...catalog,revokedAt:grant.grantedAt,accessState:'no_access',accessOverride:true};
 const response=await proxyAdmin(request('business-revoke',body),'business-revoke',config,async(url,options)=>{assert.equal(url,config.api+'/api/v1/admin/business/catalog-revocations');assert.deepEqual(JSON.parse(options.body),body);assert.equal(options.headers.get('Cookie'),cookie);assert.equal(options.headers.get('Origin'),config.origin);return Response.json(denial);});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),denial);
 for(const wrong of [{learnerId:'999'},{version:2},{reason:'Other'},{accessOverride:false},{accessState:'lifetime'},{revokedAt:null},{password:body.password}])assert.equal((await proxyAdmin(request('business-revoke',body),'business-revoke',config,async()=>Response.json({...denial,...wrong}))).status,502);
 for(const password of ['', 'x'.repeat(257), {}, null]){const response=await proxyAdmin(request('business-revoke',{...body,password}),'business-revoke',config,()=>{throw Error('must not fetch');});assert.equal(response.status,422);assert.ok(!(await response.text()).includes('fixture-secret'));}
 for(const headers of [{'X-Admin-CSRF':''},{Origin:'https://evil.example'},{cookie:''}])assert.ok([401,403].includes((await proxyAdmin(request('business-revoke',body,headers),'business-revoke',config,()=>{throw Error('must not fetch');})).status));
});
