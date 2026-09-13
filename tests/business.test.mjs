import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8125',origin:'https://localhost:3445'};
const cookie='__Host-leap_admin='+'a'.repeat(43),requestId='12345678-1234-1234-1234-123456789012',reason='A documented learner support decision.';
const permissions={canGrantCatalogAccess:true,canCloseReconciliation:true,canCreateIntervention:true};
const grant={learnerId:'123',scope:'whole_catalog',source:'admin_lifetime',reason,version:1,grantedAt:'2026-09-13T10:00:00Z',revokedAt:null,preservedSectionEntitlements:['paid-section']};
function request(action,body,headers={}){return new Request(config.origin+'/api/admin/'+action,{method:body?'POST':'GET',headers:{cookie,...(body?{Origin:config.origin,'X-Admin-CSRF':'csrf','Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
test('business grant maps fixed upstream path, preserves request identity, and validates audited result',async()=>{
 const body={requestId,learnerId:'123',baseVersion:0,reason};
 const response=await proxyAdmin(request('business-grant',body),'business-grant',config,async(url,options)=>{assert.equal(url,config.api+'/api/v1/admin/business/catalog-grants');assert.deepEqual(JSON.parse(options.body),body);assert.equal(options.headers.get('X-Admin-CSRF'),'csrf');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return Response.json(grant);});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 for(const wrong of [{learnerId:'999'},{version:2},{reason:'Other reason'},{scope:'section'}])assert.equal((await proxyAdmin(request('business-grant',body),'business-grant',config,async()=>Response.json({...grant,...wrong}))).status,502);
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
 const state={learnerId:'123',catalogGrant:null,followUpVersion:0,permissions,followUpTasks:[]};
 assert.equal((await proxyAdmin(request('business-state?learnerId=123'),'business-state',config,async()=>Response.json(state))).status,200);
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
