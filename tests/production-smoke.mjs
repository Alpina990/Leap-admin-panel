// Real production Next -> fixed FastAPI -> disposable SQLite, over browser HTTPS.
// No API interception, route mocks, live accounts, deployment or dotenv reads.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import net from 'node:net';
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
 const context=await browser.newContext({ignoreHTTPSErrors:true,baseURL:'https://localhost:3443'});
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
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await expect(page.getByText('27',{exact:true})).toBeVisible();
 const cookies=await context.cookies();assert.equal(cookies.length,1);const cookie=cookies[0];assert.equal(cookie.name,'__Host-leap_admin');assert.equal(cookie.secure,true);assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');assert.equal(cookie.path,'/');assert.equal(cookie.domain,'localhost');
 const documentCookie=await page.evaluate(()=>document.cookie);assert.equal(documentCookie,'');
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='leap-theme')),[]);
 const counts=await context.request.get('/api/admin/overview');assert.deepEqual(await counts.json(),{learnersTotal:27,coursesTotal:0,sectionsTotal:0,lessonsTotal:0});
 const authenticatedSlash=await context.request.get('/api/admin/overview/',{maxRedirects:0});
 assert.equal(authenticatedSlash.status(),200);assert.match(authenticatedSlash.headers()['cache-control'],/no-store/);
 assert.deepEqual(await authenticatedSlash.json(),await counts.json());
 console.log('PASS: authenticated trailing-slash overview 200/no-store with real SQLite counts matching canonical route.');
 await page.screenshot({path:'work/smoke/overview-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Learners',exact:true}).click();
 await expect(page.getByRole('heading',{name:'27 matching learners'})).toBeVisible();
 await expect(page.locator('tbody tr')).toHaveCount(25);
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.getByText('9007199254740993',{exact:true})).toBeVisible();
 await page.getByLabel('Username — exact, case-sensitive').fill('Exact_Case');await page.getByRole('button',{name:'Apply filter'}).click();
 await expect(page.getByRole('heading',{name:'1 matching learners'})).toBeVisible();await expect(page.getByText('9007199254740993',{exact:true})).toBeVisible();
 await page.getByLabel('Username — exact, case-sensitive').fill('exact_case');await page.getByRole('button',{name:'Apply filter'}).click();
 await expect(page.getByRole('heading',{name:'0 matching learners'})).toBeVisible();
 await page.getByRole('button',{name:'Content',exact:true}).click();await expect(page.getByRole('heading',{name:'Unavailable',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Learners',exact:true}).click();await page.getByRole('button',{name:'Clear',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(25);
 await page.getByRole('button',{name:'Toggle light or dark theme'}).click();await expect(page.locator('html')).toHaveClass(/light/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/smoke/learners-light-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok(await page.locator('table').evaluate(el=>el.getBoundingClientRect().width>=900),'Directory must scroll rather than crush names on mobile');
 const forbidden=await context.request.post('/api/admin/overview',{headers:{Origin:'https://localhost:3443','X-Admin-CSRF':'login'},data:{action:'note'}});assert.equal(forbidden.status(),405);
 const badLogout=await context.request.post('/api/admin/logout',{headers:{Origin:'https://localhost:3443','X-Admin-CSRF':'wrong'}});assert.equal(badLogout.status(),403);
 assert.equal((await context.request.get('/api/admin/session')).status(),200);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 assert.equal((await context.cookies()).length,0);
 const replay=await context.request.get('/api/admin/overview',{headers:{Cookie:cookie.name+'='+cookie.value}});assert.equal(replay.status(),401);
 assert.deepEqual(pageErrors,[]);
 console.log('PASS: production HTTPS browser login/cookie flags + HttpOnly; spoofed page/API denial; missing Origin denial; real SQLite counts; 25+2 pagination; exact-case filtering; string large ID; empty state; unavailable section; theme/mobile overflow; blocked business POST; bad logout CSRF; successful logout/deletion/revoked-cookie denial; zero browser JS errors.');
}finally{
 if(browser)await browser.close();
 await Promise.all(children.reverse().map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill();})));
 rmSync(fixtureRoot,{recursive:true,force:true});
}
