// PushDay shell palette: emerald primary on the cool-gray canvas.
import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent('<html class="light"><body><header class="pencil-navigation"><nav><button aria-current="page">Overview</button></nav></header></body></html>');
 await page.addStyleTag({content:readFileSync('app/pushday.css','utf8')});
 const primary=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--pd-primary').trim());
 assert.equal(primary,'#059669','PushDay primary token must remain emerald');
 const active=await page.locator('button[aria-current="page"]').evaluate(element=>getComputedStyle(element).color);
 assert.equal(active,'rgb(5, 150, 105)','Active navigation must use the emerald primary');
 console.log('PASS: PushDay emerald palette and active navigation');
}finally{await browser.close();}
