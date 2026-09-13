import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8124',origin:'https://localhost:3444'};
const get=p=>new Request(config.origin+'/api/admin/'+p,{headers:{cookie:'__Host-leap_admin='+'a'.repeat(43)}});
test('notes preserve CSRF and validate writes and audit DTOs',async()=>{
 const body={learnerId:'123',note:'Private note',requestId:'12345678-1234-1234-1234-123456789012'};
 const note={id:body.requestId,learnerId:'123',note:body.note,actor:'operator',createdAt:'2026-01-01T00:00:00+00:00'};
 const request=new Request(config.origin+'/api/admin/notes',{method:'POST',headers:{cookie:'__Host-leap_admin='+'a'.repeat(43),Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await proxyAdmin(request,'notes',config,async(url,init)=>{assert.equal(init.headers.get('origin'),config.origin);assert.equal(init.headers.get('x-admin-csrf'),'b'.repeat(64));assert.deepEqual(JSON.parse(init.body),body);return Response.json(note);});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),note);
 assert.equal((await proxyAdmin(get('notes?learnerId=123'),'notes',config,async()=>Response.json({items:[note],total:1,limit:25,offset:0,hasMore:false}))).status,200);
});

test('note pages remain bounded but support maximum valid Unicode content',async()=>{
 const note={id:'12345678-1234-1234-1234-123456789012',learnerId:'123',actor:'operator',note:'語'.repeat(2000),createdAt:'2026-01-01T00:00:00+00:00'};
 const data={items:Array.from({length:100},()=>note),total:100,limit:100,offset:0,hasMore:false};
 const r=await proxyAdmin(get('notes?learnerId=123&limit=100'),'notes',config,async()=>Response.json(data));assert.equal(r.status,200);
 const wrong=await proxyAdmin(get('notes?learnerId=999&limit=100'),'notes',config,async()=>Response.json(data));assert.equal(wrong.status,502);
});

test('payment allowlist is bounded and permits actual order DTOs only',async()=>{
 const data={items:[],total:0,limit:25,offset:0,hasMore:false};
 const r=await proxyAdmin(get('payments?status=paid&method=payme'),'payments',config,async(url)=>{assert.equal(url,config.api+'/api/v1/admin/payments?status=paid&method=payme');return Response.json(data);});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),data);
 for(const query of ['status=refunded','method=card','status=paid&status=pending','url=https://evil','limit=101','learnerId=9223372036854775808']) assert.equal((await proxyAdmin(get('payments?'+query),'payments',config)).status,422);
 assert.equal((await proxyAdmin(get('payment?orderId=missing'),'payment',config,async()=>Response.json({error:{code:'admin_not_found',message:'Not found'}},{status:404}))).status,404);
 assert.equal((await proxyAdmin(get('payments'),'payments',config,async()=>Response.json({...data,secret:'leak'}))).status,502);
});
