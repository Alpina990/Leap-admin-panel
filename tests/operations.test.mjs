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
 const extra=await proxyAdmin(get('payments'),'payments',config,async()=>Response.json({...data,secret:'leak'}));
 assert.equal(extra.status,200);assert.deepEqual(await extra.json(),data); // Project the allowlist; never forward additions.
});

test('catalog payment orders with no section are accepted',async()=>{
 const order={id:'727ac75f-f104-4740-b037-e2ef675c885b',learnerId:'1479914025',sectionId:null,amountTiyin:'100000',currency:'UZS',gateway:'WLCM',method:'payme',status:'pending',createdAt:'2026-09-23T15:00:00+00:00',paidAt:null,cancelledAt:null,externalId:'LE-727ac75f-f104-4740-b037-e2ef675c885b',gatewayOrderId:'wlcm-order-1',gatewayPaymentId:null};
 const page={items:[order],total:1,limit:25,offset:0,hasMore:false};
 const response=await proxyAdmin(get('payments?limit=25&offset=0'),'payments',config,async()=>Response.json(page));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),page);
});

test('ordinary app payments accept explicit inert manual-operation metadata',async()=>{
 const order={id:'727ac75f-f104-4740-b037-e2ef675c885b',learnerId:'1479914025',sectionId:null,amountTiyin:'100000',currency:'UZS',gateway:'WLCM',method:'payme',status:'paid',createdAt:'2026-09-23T15:00:00+00:00',paidAt:'2026-09-23T15:00:00+00:00',cancelledAt:null,externalId:'LE-727ac75f-f104-4740-b037-e2ef675c885b',gatewayOrderId:'wlcm-order-1',gatewayPaymentId:'wlcm-payment-1',source:'app',includedInSales:true,recordedInCrm:false,canDelete:false,manualTransactionId:null,manualTransactionVersion:null,receiptAvailable:false};
 const page={items:[order],total:1,limit:25,offset:0,hasMore:false};
 const response=await proxyAdmin(get('payments?limit=25&offset=0'),'payments',config,async()=>Response.json(page));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),page);
});

test('manual CRM transactions preserve safe deletion and receipt indicators',async()=>{
 const order={id:'manual:20000000-0000-4000-8000-000000000001',learnerId:'1479914025',sectionId:null,amountTiyin:'88000000',currency:'UZS',gateway:'CRM',method:'card_transfer',status:'paid',createdAt:'2026-10-14T13:55:51Z',paidAt:'2026-10-14T13:55:51Z',cancelledAt:null,externalId:'beecrm-payment-29631',gatewayOrderId:null,gatewayPaymentId:null,source:'crm',canDelete:true,manualTransactionId:'20000000-0000-4000-8000-000000000001',manualTransactionVersion:1,receiptAvailable:true};
 const page={items:[order],total:1,limit:25,offset:0,hasMore:false};
 const response=await proxyAdmin(get('payments?limit=25&offset=0'),'payments',config,async()=>Response.json(page));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),page);
});

test('payment pages reject overlength non-manual order identities',async()=>{
 const base={learnerId:'1479914025',sectionId:null,amountTiyin:'100000',currency:'UZS',method:'payme',status:'paid',createdAt:'2026-09-23T15:00:00+00:00',paidAt:'2026-09-23T15:00:00+00:00',cancelledAt:null,gatewayOrderId:null,gatewayPaymentId:null};
 const app={...base,id:'x'.repeat(41),gateway:'WLCM',externalId:'external-app-order'};
 const crm={...base,id:'x'.repeat(41),gateway:'CRM',externalId:null,source:'crm',matchState:'matched'};
 const manualId='manual:20000000-0000-4000-8000-000000000001';
 const disguisedApp={...app,id:manualId};
 const disguisedCrm={...crm,id:manualId};
 for(const order of [app,crm,disguisedApp,disguisedCrm]){
  const page={items:[order],total:1,limit:25,offset:0,hasMore:false};
  const response=await proxyAdmin(get('payments?limit=25&offset=0'),'payments',config,async()=>Response.json(page));
  assert.equal(response.status,502,order.gateway);
 }
 const detail=await proxyAdmin(get('payment?orderId='+encodeURIComponent(manualId)),'payment',config,async()=>Response.json({order:disguisedCrm,entitlement:null}));
 assert.equal(detail.status,502);
});

test('manual payment detail accepts its canonical identity and verifies the upstream echo',async()=>{
 const orderId='manual:20000000-0000-4000-8000-000000000001';
 const order={id:orderId,learnerId:'1479914025',sectionId:null,amountTiyin:'88000000',currency:'UZS',gateway:'CRM',method:'card_transfer',status:'paid',createdAt:'2026-10-14T13:55:51Z',paidAt:'2026-10-14T13:55:51Z',cancelledAt:null,externalId:'beecrm-payment-29631',gatewayOrderId:null,gatewayPaymentId:null,source:'crm',canDelete:true,manualTransactionId:'20000000-0000-4000-8000-000000000001',manualTransactionVersion:1,receiptAvailable:true};
 let fetched=0;
 const response=await proxyAdmin(get('payment?orderId='+encodeURIComponent(orderId)),'payment',config,async url=>{fetched++;assert.equal(url,config.api+'/api/v1/admin/payment?orderId='+encodeURIComponent(orderId));return Response.json({order,entitlement:null});});
 assert.equal(response.status,200);assert.equal(fetched,1);assert.deepEqual(await response.json(),{order,entitlement:null});
 assert.equal((await proxyAdmin(get('payment?orderId='+encodeURIComponent(orderId)),'payment',config,async()=>Response.json({order:{...order,id:'manual:30000000-0000-4000-8000-000000000001'},entitlement:null}))).status,502);
 for(const invalid of ['x'.repeat(41),'manual:'+'x'.repeat(36),'manual:20000000-0000-4000-8000-000000000001/extra']){
  let called=0;const rejected=await proxyAdmin(get('payment?orderId='+encodeURIComponent(invalid)),'payment',config,async()=>{called++;return Response.json({order,entitlement:null});});
  assert.equal(rejected.status,422,invalid);assert.equal(called,0,invalid);
 }
});

test('withdrawals validate money-out writes and paginate the ledger',async()=>{
 const created={id:'12345678-1234-1234-1234-123456789012',entryType:'withdrawal',amount:123000,signedAmount:-123000,note:'Karta raqamiga',actor:'operator',createdAt:'2026-10-15T09:00:00+00:00'};
 const page={items:[created],total:1,limit:25,offset:0,hasMore:false,withdrawnTotal:'123000'};
 const body={amount:123000,note:'Karta raqamiga',requestId:created.id};
 const request=new Request(config.origin+'/api/admin/withdrawals',{method:'POST',headers:{cookie:'__Host-leap_admin='+'a'.repeat(43),Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await proxyAdmin(request,'withdrawals',config,async(url,init)=>{assert.equal(url,config.api+'/api/v1/admin/withdrawals');assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body),body);return Response.json(created);});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),created);
 const list=await proxyAdmin(get('withdrawals?limit=25&offset=0'),'withdrawals',config,async url=>{assert.equal(url,config.api+'/api/v1/admin/withdrawals?limit=25&offset=0');return Response.json(page);});
 assert.equal(list.status,200);assert.deepEqual(await list.json(),page);
 // Legacy rows echo the actor but never a learner or payment identity.
 assert.equal((await proxyAdmin(get('withdrawals'),'withdrawals',config,async()=>Response.json({...page,items:[{...created,learnerId:'1'}]}))).status,502);
 for(const query of ['method=payme','limit=101','limit=1&limit=2','offset=-1','start=2026-02-30'])assert.equal((await proxyAdmin(get('withdrawals?'+query),'withdrawals',config)).status,422);
 for(const payload of [{...body,amount:0},{...body,amount:1.5},{...body,amount:1000000000001},{...body,note:'x'.repeat(256)},{...body,requestId:'nope'},{amount:100}])assert.equal((await proxyAdmin(new Request(config.origin+'/api/admin/withdrawals',{method:'POST',headers:{cookie:'__Host-leap_admin='+'a'.repeat(43),Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify(payload)}),'withdrawals',config)).status,422);
});
