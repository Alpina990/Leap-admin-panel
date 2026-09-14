import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=new URL(process.env.PENCIL_AUDIT_BASE || 'https://localhost:3447');
assert(base.protocol==='https:'&&['localhost','127.0.0.1'].includes(base.hostname)&&!base.username&&!base.password&&base.pathname==='/'&&!base.search&&!base.hash,'Audit base must be a loopback HTTPS origin');
const baseURL=base.origin,out=process.env.PENCIL_AUDIT_OUTPUT || 'work/live-qa/local-runtime';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
try{
 const context=await browser.newContext({baseURL,ignoreHTTPSErrors:true});
 // Credentials exist only in this disposable local fixture, never production.
 const r=await context.request.post('/api/admin/login',{headers:{Origin:baseURL,'X-Admin-CSRF':'login'},data:{username:'smoke_operator',password:'disposable-test-only-password-92!'}});assert.equal(r.status(),200);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 for(const viewport of [{width:1440,height:1000},{width:430,height:900}]){
  await page.setViewportSize(viewport);
  for(const route of ['overview','learners','content','commerce','learning','messages']){
   await page.evaluate(route=>{location.hash=route;scrollTo(0,0);},route);
   await expect(page.locator('main')).toHaveAttribute('data-route',route[0].toUpperCase()+route.slice(1));
   if(route==='commerce')await page.locator('[data-pencil-name="Learners & access Commerce Tab"]').click();
   if(['overview','learners','commerce'].includes(route))await expect(page.locator('[data-learner-id]').first()).toBeVisible();
   if(route==='messages')await expect(page.locator('[data-notification-id]').first()).toBeVisible();
   await page.evaluate(()=>document.fonts.ready);
   if(route==='content'&&viewport.width<768){
    await page.locator('[data-content-lesson-id="fixture-lesson"]').click();
    await expect(page.locator('[data-pencil-name="Lesson Editor Panel"]')).toBeVisible();
    await page.screenshot({path:`${out}/content-editor-mobile.png`,fullPage:true});
    const panels=await page.locator('[data-pencil-name="Content Studio Workspace"], [data-pencil-name="Lesson Editor Panel"], [data-pencil-name="Publish Readiness Panel"]').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.pencilName,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,bottom:n.getBoundingClientRect().bottom,parentBottom:n.parentElement.getBoundingClientRect().bottom,viewport:innerWidth,css:{direction:getComputedStyle(n).flexDirection,wrap:getComputedStyle(n).flexWrap,height:getComputedStyle(n).height}})));
    writeFileSync(out+'/content-mobile-panels.json',JSON.stringify(panels,null,2));
    for(const panel of panels)assert(panel.left>=0&&panel.right<=panel.viewport&&panel.bottom<=panel.parentBottom,`Mobile content panel clipped: ${JSON.stringify(panel)}`);
    await page.getByRole('button',{name:'Back to list',exact:true}).click();
    await expect(page.locator('[data-content-lesson-id="fixture-lesson"]')).toBeVisible();
   }
   const geometry=await page.evaluate(()=>({rows:[...document.querySelectorAll('.readonly-person')].map(x=>({width:x.getBoundingClientRect().width,parent:x.parentElement.clientWidth})),buttons:[...document.querySelectorAll('.pager button')].map(x=>({text:x.innerText,width:x.clientWidth,scroll:x.scrollWidth})),page:{width:innerWidth,scroll:document.documentElement.scrollWidth}}));
   if(['overview','learners','commerce'].includes(route))assert(geometry.rows.length>0,`${route} must exercise learner rows`);
   for(const row of geometry.rows)assert(row.width<=row.parent+1,`${route} row overflow ${JSON.stringify(row)}`);
   for(const b of geometry.buttons)assert(b.scroll<=b.width+1,`${route} pager overflow ${JSON.stringify(b)}`);
   assert(geometry.page.scroll<=geometry.page.width,`${route} document overflow`);
   await page.screenshot({path:`${out}/${route}-${viewport.width}.png`,fullPage:true});results.push({route,viewport,geometry});
   if(route==='commerce'){
    await page.locator('[data-pencil-name="Transactions Commerce Tab"]').click();
    await expect(page.locator('[data-order-id]')).toHaveCount(25);
    const transactions=await page.locator('.operations-orders').evaluate(node=>({count:node.querySelectorAll('[data-order-id]').length,panels:[node,node.querySelector('.operations-table-scroll')].map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})),buttons:[...node.querySelectorAll('.pager button')].map(n=>({width:n.clientWidth,scroll:n.scrollWidth})),width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(transactions.count,25);
    for(const panel of transactions.panels)assert(panel.left>=0&&panel.right<=transactions.width,'Transaction container clipped');
    for(const button of transactions.buttons)assert(button.scroll<=button.width+1,'Transaction pager clipped');
    assert.equal(transactions.buttons.length,2);assert(transactions.scroll<=transactions.width,'Transaction document overflow');
    await page.screenshot({path:`${out}/commerce-transactions-${viewport.width}.png`,fullPage:true});
    results.push({route:'commerce-transactions',viewport,geometry:transactions});
   }
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS authenticated isolated production runtime: six routes at desktop/mobile, real FastAPI + disposable SQLite, no row/pager/page horizontal overflow, no page errors.');
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));await browser.close();}
