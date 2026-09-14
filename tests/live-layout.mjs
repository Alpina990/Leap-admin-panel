import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {adaptDesign,indexDesign} from '../lib/design-adapter.mjs';
// Isolated presentation fixture: original design markup, never production records.
// Build first so Tailwind's actual utility rules are available.
const design=JSON.parse(readFileSync('archive/legacy/app/design.json','utf8'));
const nodes=Object.assign({},...Object.values(design).map(n=>indexDesign(adaptDesign(n))));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function render(n){if(typeof n==='string')return escape(n);return `<${n.tag} ${Object.entries(n.attrs).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}>${n.children.map(render).join('')}</${n.tag}>`;}
const css=readdirSync('.next/static/chunks').filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/chunks/'+f,'utf8')).join('\n')+'\n'+['leap','appearance','admin','pencil','operations'].map(f=>readFileSync('app/'+f+'.css','utf8')).join('\n');
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const out='work/live-qa/local-layout';mkdirSync(out,{recursive:true});const results=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:430,height:900}]){
 await page.setViewportSize(viewport);
 for(const theme of ['light','dark']){
 const row=structuredClone(nodes['Madina Karimova Learner Directory Row']);row.attrs.class+=' readonly-person';
 await page.setContent(`<html class="${theme}"><head><style>${css}</style></head><body><section style="width:360px;max-width:calc(100vw - 40px);margin:20px;display:flex;flex-direction:column;align-items:flex-start"><div class="readonly-rows" style="height:160px;flex:none"><div>${render(row)}</div></div><div data-pencil-name="Learner Directory List" style="width:100%"><div class="pager"><button class="action">Previous</button><span>Offset 0 · 9 rows · page size 25</span><button class="action">Next</button></div></div><div data-pencil-name="Message Event List" style="width:100%;height:200px;align-items:flex-start"><div class="readonly-rows">No notifications match these filters.</div><div class="pager"><button>Previous notifications</button><span>0 inbox records</span><button>Next notifications</button></div></div></section></body></html>`);
 const geometry=await page.evaluate(()=>({row:{width:document.querySelector('.readonly-person').getBoundingClientRect().width,parent:document.querySelector('.readonly-rows').clientWidth},buttons:[...document.querySelectorAll('.pager button')].map(x=>({text:x.innerText,width:x.clientWidth,scroll:x.scrollWidth})),pager:[...document.querySelectorAll('.pager')].map(x=>({width:x.clientWidth,scroll:x.scrollWidth,parent:x.parentElement.clientWidth}))}));
 results.push({viewport,theme,geometry});await page.screenshot({path:`${out}/${viewport.width}-${theme}.png`});
 assert(geometry.row.width<=geometry.row.parent+1,`Learner row exceeds allocated width: ${JSON.stringify(geometry.row)}`);
 for(const b of geometry.buttons)assert(b.scroll<=b.width+1,`Pagination label clips: ${JSON.stringify(b)}`);
 for(const p of geometry.pager)assert(p.scroll<=p.width+1&&p.width<=p.parent+1,`Pager exceeds allocation: ${JSON.stringify(p)}`);
 }
 }
 console.log('PASS live layout regressions: desktop/mobile, light/dark, row bounds and pagination labels.');
}finally{writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
