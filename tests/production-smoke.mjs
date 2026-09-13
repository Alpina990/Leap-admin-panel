// Real production Next -> fixed FastAPI -> disposable SQLite, over browser HTTPS.
// No API interception, route mocks, live accounts, deployment or dotenv reads.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import net from 'node:net';
import {compareReference,assertOriginalTree} from './visual-reference.mjs';
const backend=process.argv[2];
if(!backend)throw new Error('Pass the backend apps/api directory (read only).');
const children=[];
const fixtureRoot=mkdtempSync(resolve(tmpdir(),'leap-bff-smoke-'));
async function unusedPort(port){
 await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve));});
}
function start(command,args,env=process.env){
 const child=spawn(command,args,{env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 child.on('error',e=>{output+=e.message;});children.push(child);return ()=>output;
}
async function ready(url){
 for(let attempt=0;attempt<100;attempt++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(500)});if(r.status<500)return;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw new Error('Local service did not become ready: '+url);
}
let browser;
try{
 for(const port of [8123,3100,3443])await unusedPort(port);
 mkdirSync('work/smoke',{recursive:true});
 const apiLogs=start(resolve(backend,'.venv/Scripts/python.exe'),['tests/real-backend.py',backend,fixtureRoot]);
 try{await ready('http://127.0.0.1:8123/api/v1/admin/session');}catch(error){console.error(apiLogs());throw error;}
 const nextLogs=start(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{...process.env,NEXT_TELEMETRY_DISABLED:'1',LEAP_ADMIN_API_URL:'http://127.0.0.1:8123',LEAP_ADMIN_ORIGIN:'https://localhost:3443'});
 try{await ready('http://127.0.0.1:3100/login');}catch(error){console.error(nextLogs());throw error;}
 start(process.execPath,['tests/tls-proxy.mjs','work/smoke/key.pem','work/smoke/cert.pem']);
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({ignoreHTTPSErrors:true,baseURL:'https://localhost:3443',viewport:{width:1440,height:1000}});
 const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto('/login');
 const spoof={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test','Authorization':'Bearer forged'};
 // Inspect the first production response: following redirects hides Next's
 // automatic 308, which otherwise escapes the configured no-store headers.
 const slashOverview=await context.request.get('/api/admin/overview/',{headers:spoof,maxRedirects:0});
 assert.match(slashOverview.headers()['cache-control']??'',/no-store/,'Trailing-slash overview must be no-store before any redirect');
 assert.equal(slashOverview.status(),401);
 assert.equal(slashOverview.headers().location,undefined);
 for(const path of ['/api/admin/unknown/','/api/admin/overview/extra/']){
  const response=await context.request.get(path,{headers:spoof,maxRedirects:0});
  assert.equal(response.status(),404);assert.match(response.headers()['cache-control'],/no-store/);
 }
 const slashPost=await context.request.post('/api/admin/overview/',{headers:spoof,maxRedirects:0});
 assert.equal(slashPost.status(),405);assert.match(slashPost.headers()['cache-control'],/no-store/);
 console.log('PASS: first-response trailing-slash overview 401/no-store/no Location; unknown and nested paths 404/no-store; business POST 405/no-store.');
 for(const path of ['/api/admin/session','/api/admin/overview','/api/admin/learners']){
  const response=await context.request.get(path,{headers:spoof});assert.equal(response.status(),401);assert.match(response.headers()['cache-control'],/no-store/);
 }
 const protectedPage=await context.request.get('/',{headers:spoof,maxRedirects:0});assert.equal(protectedPage.status(),307);assert.equal(protectedPage.headers().location,'/login');
 const missingOrigin=await context.request.post('/api/admin/login',{headers:{'X-Admin-CSRF':'login'},data:{username:'smoke_operator',password:'disposable-test-only-password-92!'}});assert.equal(missingOrigin.status(),403);
 await page.getByLabel('Username',{exact:true}).fill('smoke_operator');
 await page.getByLabel('Password',{exact:true}).fill('disposable-test-only-password-92!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Operations overview',exact:true})).toBeVisible();
 await expect(page.locator('[data-pencil-name="Learner Count"]')).toHaveText('27');
 await expect(page.locator('[data-pencil-name="Active Learners Value"]')).toHaveText('—');
 await expect(page.locator('[data-pencil-name="Lessons Completed Value"]')).toHaveText('—');
 const cookies=await context.cookies();assert.equal(cookies.length,1);const cookie=cookies[0];assert.equal(cookie.name,'__Host-leap_admin');assert.equal(cookie.secure,true);assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');assert.equal(cookie.path,'/');assert.equal(cookie.domain,'localhost');
 const documentCookie=await page.evaluate(()=>document.cookie);assert.equal(documentCookie,'');
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='leap-theme')),[]);
 const counts=await context.request.get('/api/admin/overview');assert.deepEqual(await counts.json(),{learnersTotal:27,coursesTotal:0,sectionsTotal:0,lessonsTotal:0});
 const authenticatedSlash=await context.request.get('/api/admin/overview/',{maxRedirects:0});
 assert.equal(authenticatedSlash.status(),200);assert.match(authenticatedSlash.headers()['cache-control'],/no-store/);
 assert.deepEqual(await authenticatedSlash.json(),await counts.json());
 console.log('PASS: authenticated trailing-slash overview 200/no-store with real SQLite counts matching canonical route.');
 await expect(page.locator('html')).toHaveClass(/light/);
 console.log('PASS: fresh authenticated workspace defaults to the current Pencil light palette.');
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/dark/);
 await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);
 await expect(page.locator('[data-pencil-name="Learner Count"]')).toHaveText('27');
 await page.screenshot({path:'work/smoke/overview-dark.png',fullPage:true});
 const routeInfo={Overview:['bi8Au','Operations overview'],Learners:['C5tZxu','Learner directory'],Content:['DUfwI','Course & lesson studio'],Commerce:['uYGzD',"Know where every so'm is moving."],Learning:['KNuM1','Learning outcomes'],Messages:['nqETx','Notification events']};
 for(const [route,[key,title]] of Object.entries(routeInfo)){
  await page.getByRole('button',{name:route,exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('.design-screen')).toBeVisible();await expect(page.locator('.design-nav')).toHaveCount(6);
  await expect(page.locator('main')).not.toContainText(/Madina|Karimova|1,284|8,492|186\.4M|Daily routines\.mp4|evt_7K18/);
  const disabled=page.locator('.design-screen button[data-pencil-name]:disabled');assert.ok(await disabled.count()>0);
  for(const button of await disabled.all())assert.match(await button.getAttribute('title'),/Unavailable/);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(async()=>{await Promise.all([document.fonts.load('12px "Funnel Sans"'),document.fonts.load('12px "IBM Plex Mono"')]);return document.fonts.check('12px "Funnel Sans"')&&document.fonts.check('12px "IBM Plex Mono"');}),true,'Original fonts must load for visual comparison');
  await assertOriginalTree(page,key);
  await page.screenshot({path:`work/smoke/${route.toLowerCase()}-dark.png`,fullPage:true});
  await compareReference(browser,page,route,key);
 }
 await page.getByRole('button',{name:'Overview',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(4);
 await page.locator('[data-learner-id="2"] button').click();
 await page.getByRole('button',{name:'Open full profile →',exact:true}).click();
 await expect(page.locator('[data-pencil-name="Selected Learner Profile Meta"]')).toContainText('@fixture_2');
 await expect(page.getByText('27 matching learners',{exact:true})).toBeVisible();
 await expect(page.locator('[data-learner-id]')).toHaveCount(25);
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(2);
 await page.locator('[data-learner-id="9007199254740993"] button').click();
 await expect(page.locator('[data-pencil-name="Selected Learner Profile Meta"]')).toContainText('9007199254740993');
 await page.getByLabel('Username — exact, case-sensitive').fill('Exact_Case');await page.getByRole('button',{name:'Apply filter'}).click();
 await expect(page.getByText('1 matching learners',{exact:true})).toBeVisible();await expect(page.locator('[data-pencil-name="Selected Learner Profile Meta"]')).toContainText('9007199254740993');
 await page.getByRole('button',{name:'Open full record',exact:true}).click();await expect(page.getByText('9007199254740993',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await page.getByLabel('Username — exact, case-sensitive').fill('exact_case');await page.getByRole('button',{name:'Apply filter'}).click();
 await expect(page.getByText('0 matching learners',{exact:true})).toBeVisible();await expect(page.getByText('No learner selected',{exact:true})).toBeVisible();
 await page.screenshot({path:'work/smoke/learners-empty-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Content',exact:true}).click();await expect(page.getByRole('heading',{name:'Course & lesson studio',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Learners',exact:true}).click();await page.getByRole('button',{name:'Clear',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(25);
 await page.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).toHaveClass(/light/);
 await page.screenshot({path:'work/smoke/learners-light-desktop.png',fullPage:true});
 await compareReference(browser,page,'Learners','C5tZxu');
 for(const [route,[key,title]] of Object.entries(routeInfo)){
  await page.getByRole('button',{name:route,exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  if(['Overview','Learners','Commerce'].includes(route))await expect(page.locator('[data-learner-id]')).toHaveCount(route==='Overview'?4:25);
  await page.evaluate(()=>document.fonts.ready);
  await assertOriginalTree(page,key);
  await page.screenshot({path:`work/smoke/${route.toLowerCase()}-light-desktop.png`,fullPage:true});
  await compareReference(browser,page,route,key);
 }
 await page.getByRole('button',{name:'Learners',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(25);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/smoke/learners-light-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Next',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Next',exact:true})).toBeInViewport();
 const pagerBounds=await page.locator('.pager').boundingBox(),workspaceBounds=await page.locator('[data-pencil-name="Learner Directory Workspace"]').boundingBox();
 assert.ok(pagerBounds.y+pagerBounds.height<=workspaceBounds.y+workspaceBounds.height, 'Mobile pager must fit entirely inside its original workspace');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[data-learner-id] button').first().click();await expect(page.locator('[data-pencil-name="Selected Learner Profile"]')).toBeVisible();await page.screenshot({path:'work/smoke/learner-detail-light-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Back to list',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Commerce',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(25);
 assert.ok(await page.locator('[data-pencil-name="Learners Access Table Header"]').evaluate(el=>el.getBoundingClientRect().width>=850),'Original finance columns must scroll rather than crush names on mobile');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'work/smoke/commerce-light-mobile.png',fullPage:true});
 // Real network failure, not a fabricated API response. Recovery must not
 // retain stale selected identities or misrepresent missing rows as zero.
 await context.setOffline(true);await page.getByRole('button',{name:'Refresh data',exact:true}).click();
 await expect(page.locator('.design-screen').getByRole('alert')).toContainText('Data unavailable');
 await expect(page.locator('[data-learner-id]')).toHaveCount(0);
 await expect(page.locator('.design-screen')).not.toContainText('0 rows');
 await page.screenshot({path:'work/smoke/commerce-network-error-light-mobile.png',fullPage:true});
 await context.setOffline(false);await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.locator('[data-learner-id]')).toHaveCount(25);
 for(const [route,[,title]] of Object.entries(routeInfo)){
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:route,exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  if(['Overview','Learners','Commerce'].includes(route))await expect(page.locator('[data-learner-id]')).toHaveCount(route==='Overview'?4:25);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route}: mobile horizontal overflow`);
  await page.screenshot({path:`work/smoke/${route.toLowerCase()}-light-mobile.png`,fullPage:true});
 }
 const forbidden=await context.request.post('/api/admin/overview',{headers:{Origin:'https://localhost:3443','X-Admin-CSRF':'login'},data:{action:'note'}});assert.equal(forbidden.status(),405);
 const badLogout=await context.request.post('/api/admin/logout',{headers:{Origin:'https://localhost:3443','X-Admin-CSRF':'wrong'}});assert.equal(badLogout.status(),403);
 assert.equal((await context.request.get('/api/admin/session')).status(),200);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 assert.equal((await context.cookies()).length,0);
 const replay=await context.request.get('/api/admin/overview',{headers:{Cookie:cookie.name+'='+cookie.value}});assert.equal(replay.status(),401);
 assert.deepEqual(pageErrors,[]);
 console.log('PASS: production HTTPS Edge + real FastAPI/SQLite; login/Secure/HttpOnly/SameSite; spoof and Origin denial; real counts; 25+2 pagination; exact-case filtering; string large ID; selected-record navigation; empty/error/retry without fake zero; six original DOM/class trees; original card/workspace geometry within 1px; loaded original fonts; all six mobile routes without horizontal overflow; theme; blocked mutations; logout CSRF/deletion/revocation; zero browser JS errors.');
}finally{
 if(browser)await browser.close();
 await Promise.all(children.reverse().map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill();})));
 rmSync(fixtureRoot,{recursive:true,force:true});
}
