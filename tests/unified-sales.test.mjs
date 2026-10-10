import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8125',origin:'https://localhost:3445'};
const period={start:'2026-10-01',end:'2026-10-09',timezone:'UTC'};
export const sales={appPaidOrders:2,appRevenueTiyin:'20000',crmSales:1,crmRevenueTiyin:'30000',crmMirrored:1,crmMatched:1,crmUnmatched:1,totalPaidOrders:3,totalRevenueTiyin:'50000'};
export const summary={period,learnersTotal:2,uniquePhoneUsers:2,webOnlyPhoneUsers:0,newLearners:2,activeLearners:1,completedLessons:1,completionLearners:1,paidOrders:3,revenueTiyin:'50000',previousRevenueTiyin:'0',currency:'UZS',daily:[],paymentMethods:[{method:'crm',count:1,revenueTiyin:'30000'}],products:[],notificationCreated:0,notificationRead:0,definitions:{revenue:'Combined canonical sales',activeLearners:'',completedLessons:'',attention:'',health:'',notificationRead:''},sales,crmSync:{lastSuccessAt:'2026-10-09T01:00:00Z',lastError:null,lastRunSalesCreated:1,lastRunUnmatched:1}};
async function proxy(action,data,query=''){
 return proxyAdmin(new Request(config.origin+'/api/admin/'+action+query,{headers:{cookie:'__Host-leap_admin='+'a'.repeat(43)}}),action,config,async()=>Response.json(data));
}
test('combined summary accepts validated sales and sync metadata through BFF',async()=>{
 const response=await proxy('analytics-summary',summary);
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),summary);
});
test('summary rolling additions are stripped, not forwarded, while known fields remain bounded',async()=>{
 const response=await proxy('analytics-summary',{...summary,internalSecret:'never forward',sales:{...sales,futureCount:3},crmSync:{...summary.crmSync,futureState:'ready'}});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),summary);
 for(const invalid of [{sales:{...sales,crmSales:-1}},{sales:{...sales,crmRevenueTiyin:'1e5'}},{crmSync:{...summary.crmSync,lastSuccessAt:'yesterday'}},{crmSync:{...summary.crmSync,lastError:'x'.repeat(1025)}}])assert.equal((await proxy('analytics-summary',{...summary,...invalid})).status,502);
 const legacy={...summary};delete legacy.sales;delete legacy.crmSync;
 assert.equal((await proxy('analytics-summary',legacy)).status,200);
});
export const crmOrder={id:'crm:12345678-1234-1234-1234-123456789012',learnerId:null,sectionId:null,amountTiyin:'30000',currency:'UZS',gateway:'CRM',method:'crm',status:'paid',createdAt:'2026-10-09T01:00:00Z',paidAt:'2026-10-09T01:00:00Z',cancelledAt:null,externalId:'lead-1',gatewayOrderId:null,gatewayPaymentId:null,source:'crm',matchState:'unmatched'};
test('CRM transactions support unknown learners and detail identity without forwarding additions',async()=>{
 const page={items:[crmOrder],total:1,limit:25,offset:0,hasMore:false};
 const response=await proxy('payments',{...page,items:[{...crmOrder,privatePayload:'redacted'}],futureVersion:2});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),page);
 const detail={order:crmOrder,entitlement:null};
 assert.equal((await proxy('payment',detail,'?orderId='+encodeURIComponent(crmOrder.id))).status,200);
 assert.equal((await proxy('payment',detail,'?orderId=other')).status,502);
 for(const invalid of [{amountTiyin:'-1'},{learnerId:'not-an-id'},{gateway:'unsafe'},{source:'unknown'},{matchState:'invented'}])assert.equal((await proxy('payments',{...page,items:[{...crmOrder,...invalid}]})).status,502);
});
test('sales presentation uses combined totals without adding CRM twice and distinguishes missing sync',async()=>{
 const {salesDetails,transactionIdentity}=await import('../lib/admin-sales.mjs');
 const facts=salesDetails(summary);
 assert.deepEqual(facts.slice(0,2),[['App sotuvlari','2 · 200.00 UZS'],['CRM sotuvlari','1 · 300.00 UZS']]);
 assert.ok(facts.some(([label,value])=>label==='CRM oxirgi sync'&&value==='2026-10-09 06:00'));
 assert.ok(salesDetails({...summary,crmSync:{...summary.crmSync,lastSuccessAt:null,lastError:'timeout'}}).some(([,value])=>value==='Sync xatosi · qayta tekshirish kerak'));
 assert.ok(salesDetails({}).some(([,value])=>value==='Mavjud emas'));
 assert.deepEqual(transactionIdentity(crmOrder),{learnerId:null,label:'CRM · profil ulanmagan',detail:'CRM'});
 assert.equal(transactionIdentity({...crmOrder,learnerId:'42'}).label,'ID 42');
});
test('commerce connects source facts and unknown-learner guards inside existing panels',async()=>{
 const {readFileSync}=await import('node:fs');
 const ui=readFileSync(new URL('../app/admin-app.tsx',import.meta.url),'utf8');
 assert.match(ui,/salesDetails\(summary.data\)/);
 assert.match(ui,/transactionIdentity\(order\)/);
 assert.match(ui,/filter\(\(id\):id is string=>id!==null\)/);
 assert.match(ui,/disabled=\{!order.learnerId\}/);
 assert.match(ui,/summary.error/);
 assert.ok(ui.includes('["payme","click","uzum","paylov","tribute","crm"]'),'existing method selector exposes CRM and Tribute');
 assert.match(ui,/summary.data\?\.revenueTiyin/);
 assert.doesNotMatch(ui,/BigInt\(summary.data.sales.crmRevenueTiyin\)/);
});
test('canonical backend DTO supports nullable CRM external ID and explicit sales eligibility',async()=>{
 const row={...crmOrder,externalId:null,includedInSales:true};
 const response=await proxy('payments',{items:[row],total:1,limit:25,offset:0,hasMore:false},'?method=crm');
 assert.equal(response.status,200);assert.deepEqual((await response.json()).items,[row]);
 assert.equal((await proxy('payments',{items:[],total:0,limit:25,offset:0,hasMore:false},'?method=tribute')).status,200);
 assert.equal((await proxy('payment',{order:row,entitlement:null},'?orderId='+row.id)).status,200);
 const metadata={...summary,sales:{...sales,payingCustomers:3},crmSync:{...summary.crmSync,status:'ok'}};
 assert.deepEqual(await (await proxy('analytics-summary',metadata)).json(),metadata);
 assert.equal((await proxy('analytics-summary',{...metadata,crmSync:{...metadata.crmSync,status:'invented'}})).status,502);
 assert.equal((await proxy('payments',{items:[{...row,includedInSales:'yes'}],total:1,limit:25,offset:0,hasMore:false})).status,502);
});
test('transaction eligibility and explicit sync status never imply missing data is successful',async()=>{
 const {salesEligibility,salesDetails}=await import('../lib/admin-sales.mjs');
 assert.equal(salesEligibility({includedInSales:true}),'Hisoblangan');
 assert.equal(salesEligibility({includedInSales:false}),'Hisoblanmagan');
 assert.equal(salesEligibility({includedInSales:null}),'Mavjud emas');
 assert.ok(salesDetails({...summary,crmSync:{...summary.crmSync,status:'error'}}).some(([,value])=>value==='Sync xatosi · qayta tekshirish kerak'));
});
test('whole-catalog product revenue has no fabricated section identity',async()=>{
 const data={...summary,products:[{sectionId:null,title:'Whole catalog',count:3,revenueTiyin:'50000'}]};
 const response=await proxy('analytics-summary',data);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),data);
});
const learnerProfile=id=>({telegramUserId:id,username:null,firstName:null,lastName:null,languageCode:null,createdAt:'2026-10-01T00:00:00Z',lastSeenAt:'2026-10-09T00:00:00Z'});
function learnerPaymentFixture(rowsById){
 const calls=[];
 const fetcher=async raw=>{
  const url=new URL(raw),q=url.searchParams;calls.push(url);
  if(url.pathname.endsWith('/learners')){
   const items=q.has('learnerId')?[learnerProfile(q.get('learnerId'))]:Object.keys(rowsById).map(learnerProfile);
   return Response.json({items,total:items.length,limit:Number(q.get('limit')),offset:0,hasMore:false});
  }
  const rows=rowsById[q.get('learnerId')],offset=Number(q.get('offset'));
  // A short upstream page can still have another page.
  return Response.json({items:rows.slice(offset,offset+1),total:rows.length,limit:100,offset,hasMore:offset+1<rows.length});
 };
 return {calls,run:(action,query)=>proxyAdmin(new Request(config.origin+'/api/admin/'+action+'?'+query,{headers:{cookie:'__Host-leap_admin='+'a'.repeat(43)}}),action,config,fetcher)};
}
const paymentRow=(id,overrides={})=>({...crmOrder,id,learnerId:'42',includedInSales:true,...overrides});
test('learner summary counts only canonical eligible payments across pages and retains profile',async()=>{
 const fixture=learnerPaymentFixture({'42':[
  paymentRow('app-1',{source:'app',gateway:'WLCM',amountTiyin:'10000',includedInSales:false,paidAt:'2026-10-10T00:00:00Z'}),
  paymentRow('crm-1'),
 ]});
 const response=await fixture.run('learner-payments','learnerIds=42&includeProfiles=1&start=2026-10-01&end=2026-10-10');
 assert.equal(response.status,200);
 assert.deepEqual((await response.json()).items,[{learnerId:'42',paymentsCount:1,paidTotalTiyin:'30000',lastPaidAt:crmOrder.paidAt,learner:learnerProfile('42')}]);
 const paymentCalls=fixture.calls.filter(url=>url.pathname.endsWith('/payments'));
 assert.deepEqual(paymentCalls.map(url=>url.searchParams.get('offset')),['0','1']);
 for(const url of paymentCalls){assert.equal(url.searchParams.get('status'),'paid');assert.equal(url.searchParams.get('start'),'2026-10-01');assert.equal(url.searchParams.get('end'),'2026-10-10');}
});
test('learner summary explicitly preserves omitted and null legacy eligibility',async()=>{
 const omitted=paymentRow('legacy');delete omitted.includedInSales;
 const fixture=learnerPaymentFixture({'42':[omitted,paymentRow('null',{includedInSales:null}),paymentRow('excluded',{includedInSales:false})]});
 const response=await fixture.run('learner-payments','learnerIds=42');
 assert.equal(response.status,200);
 assert.deepEqual((await response.json()).items,[{learnerId:'42',paymentsCount:2,paidTotalTiyin:'60000',lastPaidAt:crmOrder.paidAt}]);
});
test('learner payment count and amount sorts use eligible summaries before directory pagination',async()=>{
 for(const sort of ['payments','total'])for(const direction of ['asc','desc']){
  const fixture=learnerPaymentFixture({'42':[paymentRow('excluded',{includedInSales:false,amountTiyin:'90000'}),paymentRow('excluded-2',{includedInSales:false})],'43':[paymentRow('eligible',{learnerId:'43'})]});
  const response=await fixture.run('learners',`sort=${sort}&direction=${direction}&limit=1&offset=0`);
  assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.items[0].telegramUserId,direction==='asc'?'42':'43');assert.equal(data.total,2);assert.equal(data.hasMore,true);
 }
});
test('learner last paid timestamp is latest eligible instant regardless of created-order pages',async()=>{
 const fixture=learnerPaymentFixture({'42':[paymentRow('older'),paymentRow('newer',{paidAt:'2026-10-10T06:00:00+05:00'}),paymentRow('excluded',{includedInSales:false,paidAt:'2026-10-11T00:00:00Z'})]});
 const response=await fixture.run('learner-payments','learnerIds=42');
 assert.equal(response.status,200);assert.equal((await response.json()).items[0].lastPaidAt,'2026-10-10T06:00:00+05:00');
});
test('sales source money retains exact two-decimal tiyin even beyond safe integers',async()=>{
 const {salesDetails}=await import('../lib/admin-sales.mjs');
 for(const [tiyin,expected] of [['199','1.99 UZS'],['1','0.01 UZS'],['0','0.00 UZS'],['100','1.00 UZS'],['999999999999999999999999999999','9,999,999,999,999,999,999,999,999,999.99 UZS']]){
  const facts=salesDetails({...summary,sales:{...sales,appRevenueTiyin:tiyin,crmRevenueTiyin:tiyin}});
  assert.equal(facts[0][1],`2 · ${expected}`);assert.equal(facts[1][1],`1 · ${expected}`);
 }
});
test('BFF replaces upstream sync diagnostics with a bounded safe indicator without hiding errors',async()=>{
 const {salesDetails}=await import('../lib/admin-sales.mjs');
 const sentinel='SENTINEL_SECRET_TOKEN upstream https://internal.example/?token=private';
 for(const status of [undefined,'ok','error']){
  const response=await proxy('analytics-summary',{...summary,crmSync:{...summary.crmSync,...(status?{status}:{}),lastError:sentinel}});
  assert.equal(response.status,200);
  const body=await response.text();assert.ok(!body.includes(sentinel));assert.ok(!body.includes('private'));assert.ok(!body.includes('internal.example'));
  const data=JSON.parse(body);assert.equal(data.crmSync.lastError,'sync_error');
  assert.ok(salesDetails(data).some(([,value])=>value==='Sync xatosi · qayta tekshirish kerak'));
 }
 for(const lastError of [null,'']){
  const response=await proxy('analytics-summary',{...summary,crmSync:{...summary.crmSync,status:'error',lastError}});
  assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.crmSync.lastError,null);
  assert.ok(salesDetails(data).some(([,value])=>value==='Sync xatosi · qayta tekshirish kerak'));
 }
});
export {proxy};
