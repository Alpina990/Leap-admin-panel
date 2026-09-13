import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const baseURL=process.env.ADMIN_READ_BASE||'https://localhost:3444';
const out='work/pencil/read-runtime';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({baseURL,ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
 const login=await context.request.post('/api/admin/login',{headers:{Origin:baseURL,'X-Admin-CSRF':'login'},data:{username:'smoke_operator',password:'disposable-test-only-password-92!'}});assert.equal(login.status(),200);
 const page=await context.newPage();await page.goto('/#messages');
 await expect(page.getByText('Mini App inbox records; Telegram delivery receipts are unavailable.',{exact:true})).toBeVisible();
 await expect(page.locator('[data-notification-id]')).toHaveCount(25);
 await page.locator('[data-notification-id]').first().click();
 await expect(page.getByRole('dialog',{name:'Notification detail',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText('Disposable notification 26');
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:out+'/notification-detail.png'});
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Next notifications',exact:true}).click();await expect(page.locator('[data-notification-id]')).toHaveCount(2);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-notification-id]').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:out+'/notification-mobile.png'});
 const read=await context.request.get('/api/admin/notification?notificationId=fixture-notification-26');assert.equal((await read.json()).readAt,null);
 await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Learners',exact:true}).click();
 await page.locator('[data-pencil-name="Learner Directory Sort"]').click();
 await page.getByLabel('Sort field',{exact:true}).selectOption('telegramUserId');await page.getByLabel('Sort direction',{exact:true}).selectOption('desc');await page.getByRole('button',{name:'Apply sorting',exact:true}).click();
 await expect(page.locator('[data-learner-id]').first()).toHaveAttribute('data-learner-id','9007199254740993');
 await page.locator('[data-pencil-name="Export Learners Button"]').click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/learners.csv');assert.equal(download.suggestedFilename(),'leap-learners-page.csv');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Overview',exact:true}).click();await page.locator('[data-pencil-name="Date Range Control"]').click();await page.getByLabel('Start date (UTC)').fill('2000-01-01');await page.getByLabel('End date (UTC)').fill('2000-01-02');await page.getByRole('button',{name:'Apply range',exact:true}).click();await expect(page.locator('[data-learner-id]')).toHaveCount(0);await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:out+'/date-filter.png'});
 console.log('PASS real inbox list, pagination, desktop/mobile detail, server sorting, UTC date range and CSV download');
}finally{await browser.close();}
