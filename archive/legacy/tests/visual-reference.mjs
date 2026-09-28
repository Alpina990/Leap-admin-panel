// Isolated, nonproduction reference. Renders immutable archive geometry only;
// sample text here is fixture evidence, never an application route or API input.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {compile} from '@tailwindcss/node';
import assert from 'node:assert/strict';
const design=JSON.parse(readFileSync('archive/legacy/app/design.json','utf8'));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const tone=n=>['Payments Filter Toolbar','Learner Directory Toolbar'].includes(n)?'light':['Primary Navigation','Learner Operations Workspace','Learner Directory Workspace','Content Studio Workspace','Message Events Workspace','Individual Payments Operations Workspace','Learning Insights Rail','Financial Command Center'].includes(n)?'dark':null;
function markup(node,route){
 if(typeof node==='string')return escape(node);
 const attrs={...node.attrs};const name=attrs['data-pencil-name'];
 if(name?.startsWith('Production /'))attrs.class='design-screen '+attrs.class;
 if(name?.endsWith(' Nav Item')){attrs.class+=' design-nav';if(name===route+' Nav Item')attrs['aria-current']='page';}
 const t=tone(name);if(t)attrs['data-theme-tone']=t;else if(/bg-\[#(?:7469E8|00866B)\]|background-image:linear-gradient/.test(attrs.class||''))attrs['data-theme-tone']='accent';
 return `<${node.tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}>${node.children.map(n=>markup(n,route)).join('')}</${node.tag}>`;
}
let css;
export async function assertOriginalTree(page,key){
 const differences=await page.evaluate(root=>{
  const replaced=new Set(['Navigation Utilities','Learner Directory Search','Payment Search','Learner Directory List','Payments List Panel','Recent Learners Panel']);
  const failures=[];
  const walk=(node,parent)=>{
   if(typeof node==='string')return;
   const name=node.attrs['data-pencil-name'];
   const id=node.attrs['data-pencil-id'];
   const element=id?document.querySelector(`[data-pencil-id="${id}"]`):null;
   if(id&&!element){failures.push(`Missing ${name} (${id})`);return;}
   if(element){
    for(const token of (node.attrs.class??'').split(/\s+/).filter(Boolean))if(!element.classList.contains(token))failures.push(`${name}: lost ${token}`);
    if(parent&&element.parentElement!==parent)failures.push(`${name}: parent changed`);
   }
   if(replaced.has(name))return;
   node.children.forEach(child=>walk(child,element??parent));
  };walk(root,null);return failures;
 },design[key]);
 assert.deepEqual(differences,[],'All original non-data DOM edges/classes must survive');
}
export async function compareReference(browser,page,route,key){
 if(!css){
  const tokens=new Set();const walk=n=>{if(typeof n==='string')return;(n.attrs.class??'').split(/\s+/).forEach(t=>tokens.add(t));n.children.forEach(walk);};Object.values(design).forEach(walk);
  const compiler=await compile(readFileSync('app/globals.css','utf8'),{base:resolve('app'),onDependency:()=>{}});
  css=compiler.build([...tokens])+'\n'+readFileSync('app/leap.css','utf8')+'\n'+readFileSync('app/appearance.css','utf8');
 }
 const theme=await page.locator('html').getAttribute('class');
 const reference=await browser.newContext({viewport:page.viewportSize()});
 try{
  const fixture=await reference.newPage();
  await fixture.setContent(`<!doctype html><html class="${escape(theme)}"><head><meta charset="utf-8"><style>${css}</style></head><body><main data-route="${route}">${markup(design[key],route)}</main></body></html>`);
  await fixture.evaluate(()=>document.fonts.ready);
  await fixture.evaluate(()=>Promise.all([document.fonts.load('12px "Funnel Sans"'),document.fonts.load('12px "IBM Plex Mono"')]));
  await fixture.screenshot({path:`work/smoke/reference-${route.toLowerCase()}-${theme}.png`,fullPage:true});
  // Compare outer shell, cards and workspace allocations. Data-leaf pixels
  // necessarily differ; original demo analytics must not survive adaptation.
  const names=[];const walk=n=>{if(typeof n==='string')return;const name=n.attrs['data-pencil-name']??'';if(/Metric Card$|^(Overview Metrics|Learning Pulse Row|Learner Operations Workspace|Learner Directory Workspace|Content Studio Workspace|Financial Command Center|Financial Analysis Row|Learning Analytics Workspace|Message Events Workspace)$/.test(name))names.push(name);n.children.forEach(walk);};walk(design[key]);
  const measurements=[];
  for(const name of names){
   const selector=`[data-pencil-name="${name}"]`;
   const actual=await page.locator(selector).boundingBox(),expected=await fixture.locator(selector).boundingBox();
   assert.ok(actual&&expected,`${route}: missing original ${name}`);
   const delta={x:actual.x-expected.x,y:actual.y-expected.y,width:actual.width-expected.width,height:actual.height-expected.height};
   measurements.push({name,actual,expected,delta});
   for(const [axis,value] of Object.entries(delta))assert.ok(Math.abs(value)<=1,`${route}: ${name} ${axis} changed by ${value}px from the immutable geometry`);
  }
  writeFileSync(`work/smoke/geometry-${route.toLowerCase()}-${theme}.json`,JSON.stringify(measurements,null,2));
  return measurements;
 }finally{await reference.close();}
}
