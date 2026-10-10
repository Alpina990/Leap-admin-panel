import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

// Browser-only API-shaped fixtures; authentication still uses the disposable
// real backend. No fixture branch or data exists in the shipped application.
export async function checkUnifiedSales(page, out){
 const response=await page.request.get('/api/admin/analytics-summary');
 if(response.status()!==200){
  const cookies=await page.context().cookies();
  const upstream=await page.request.get('http://127.0.0.1:'+(process.env.PENCIL_AUDIT_API_PORT||8127)+'/api/v1/admin/analytics/summary',{headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')}});
  const {analyticsSchemas}=await import('../lib/admin-analytics-contract.mjs');
  const parsed=analyticsSchemas['analytics-summary'].safeParse(await upstream.json());
  assert(parsed.success,JSON.stringify(parsed.error?.issues));
 }
 assert.equal(response.status(),200,'real summary contract must pass before fixture checks');
 const original=await response.json();
 if(process.env.UNIFIED_SALES_ONLY==='1'){
  assert.equal(original.revenueTiyin,'90000');assert.equal(original.paidOrders,3);
  assert.equal(original.sales.appRevenueTiyin,'20000');assert.equal(original.sales.crmRevenueTiyin,'70000');
  const ledger=await page.request.get('/api/admin/payments?method=crm');
  assert.equal(ledger.status(),200);const rows=(await ledger.json()).items;
  assert.equal(rows.length,2);assert(rows.some(row=>row.learnerId===null));assert(rows.some(row=>row.learnerId==='1'));
  for(const row of rows){
   const detail=await page.request.get('/api/admin/payment?orderId='+encodeURIComponent(row.id));
   assert.equal(detail.status(),200);assert.deepEqual((await detail.json()).order,row);
  }
 }
 const summary={...original,paidOrders:3,revenueTiyin:'50000',paymentMethods:[{method:'crm',count:1,revenueTiyin:'30000'},{method:'payme',count:2,revenueTiyin:'20000'}],sales:{appPaidOrders:2,appRevenueTiyin:'20000',crmSales:1,crmRevenueTiyin:'30000',crmMirrored:1,crmMatched:0,crmUnmatched:1,totalPaidOrders:3,totalRevenueTiyin:'50000'},crmSync:{lastSuccessAt:'2026-10-09T01:00:00Z',lastError:null,lastRunSalesCreated:1,lastRunUnmatched:1}};
 const order={id:'crm:12345678-1234-1234-1234-123456789012',source:'crm',learnerId:null,sectionId:null,amountTiyin:'30000',currency:'UZS',gateway:'CRM',method:'crm',status:'paid',createdAt:'2026-10-09T01:00:00Z',paidAt:'2026-10-09T01:00:00Z',cancelledAt:null,externalId:'lead-1',gatewayOrderId:null,gatewayPaymentId:null,matchState:'unmatched'};
 let mode='loaded';
 const requests=[];
 page.on('request',request=>{if(request.url().includes('/api/admin/'))requests.push(request.url());});
 await page.route('**/api/admin/analytics-summary*',route=>route.fulfill({status:mode==='unavailable'?502:200,json:mode==='unavailable'?{error:{message:'Administrator service unavailable.'}}:mode==='legacy'?Object.fromEntries(Object.entries(summary).filter(([key])=>!['sales','crmSync'].includes(key))):mode==='sync-error'?{...summary,crmSync:{...summary.crmSync,lastSuccessAt:null,lastError:'private upstream diagnostic'}}:summary}));
 await page.route('**/api/admin/payments?*',route=>route.fulfill({json:{items:[order],total:1,limit:25,offset:0,hasMore:false}}));
 await page.route('**/api/admin/payment?*',route=>route.fulfill({json:{order,entitlement:null}}));
 for(const width of [1440,430]){
  await page.setViewportSize({width,height:1000});
  await page.goto('/#commerce');
  await page.reload();
  await expect(page.locator('[data-order-id]')).toHaveCount(1);
  await expect(page.locator('.pd-metric-card')).toHaveCount(4);
  await expect(page.locator('.pd-metric-card').filter({hasText:'Jami tushum'})).toContainText('500 UZS');
  await expect(page.locator('[data-provider="crm"]')).toContainText('60%');
  const person=page.locator('[data-order-id] .pd-person-link');
  await expect(person).toHaveText('CRM · profil ulanmaganCRM');
  await expect(person).toBeDisabled();
  await expect(page.getByLabel('Sotuv manbalari va CRM sync')).toContainText('2 · 200.00 UZS');
  await expect(page.getByLabel('Sotuv manbalari va CRM sync')).toContainText('2026-10-09 06:00');
  await expect(page.locator('.pd-detail-panel')).toContainText('Profil ulanmagan');
  await page.getByRole('button',{name:'Filtr',exact:true}).click();
  await page.getByRole('dialog',{name:'To‘lov filtrlari',exact:true}).getByRole('combobox').nth(1).selectOption('crm');
  await page.getByRole('button',{name:'Qo‘llash',exact:true}).click();
  await expect.poll(()=>requests.some(url=>url.includes('method=crm'))).toBe(true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'commerce overflow');
  await page.screenshot({path:`${out}/commerce-unified-${width}.png`,fullPage:true});
 }
 assert(!requests.some(url=>url.includes('learnerIds=')||url.includes('learnerId=null')),'unmatched CRM must not query fake learner IDs');
 mode='sync-error';await page.reload();
 await expect(page.getByLabel('Sotuv manbalari va CRM sync')).toContainText('Sync xatosi');
 await expect(page.locator('body')).not.toContainText('private upstream diagnostic');
 mode='legacy';await page.reload();
 await expect(page.getByLabel('Sotuv manbalari va CRM sync')).toContainText('Mavjud emas');
 mode='unavailable';await page.reload();
 await expect(page.locator('body')).toContainText('Administrator service unavailable.');
 await expect(page.locator('body')).not.toContainText('Daromad yo‘q');
 await expect(page.locator('.pd-metric-card').filter({hasText:'Jami tushum'})).toContainText('—');
 console.log('PASS unified CRM browser fixtures: combined totals, provider share, unknown learner, sync failure, legacy metadata, unavailable, 1440/430px');
}
