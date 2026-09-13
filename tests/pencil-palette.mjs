// Actual Pen MCP Get/Export: all six main detail gradients have both stops #6655BB.
// This narrow palette gate is not an assertion of full UI/UX parity.
import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent('<html class="light"><body><div class="[background-image:linear-gradient(125deg,#7469E8,#00866B)]" style="width:320px;height:200px"></div></body></html>');
 await page.addStyleTag({content:readFileSync('app/appearance.css','utf8')});
 const background=await page.locator('div').evaluate(e=>getComputedStyle(e).backgroundImage);
 assert.equal(background,'linear-gradient(125deg, rgb(102, 85, 187), rgb(102, 85, 187))','Pencil detail surfaces are uniform #6655BB, not an invented two-tone gradient');
 console.log('PASS: current Pencil light detail gradient stops #6655BB');
}finally{await browser.close();}
