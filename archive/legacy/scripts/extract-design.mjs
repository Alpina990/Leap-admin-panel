import fs from 'node:fs';
const source = fs.readFileSync(process.argv[2]||'.sites-runtime/design-reference.html','utf8');
const decode = s => s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(+v));
const root={tag:'root',attrs:{},children:[]}; const stack=[root];
for(const token of source.match(/<!--[\s\S]*?-->|<[^>"']*(?:"[^"]*"|'[^']*'|[^>"']*)*>|[^<]+/g)||[]){
 if(token.startsWith('<!'))continue;
 if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
 if(token.startsWith('<')){const tag=token.match(/^<([\w:-]+)/)?.[1];if(!tag)continue;const attrs={};for(const m of token.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1]]=decode(m[2]??m[3]); const n={tag,attrs,children:[]};stack.at(-1).children.push(n);if(!/\/>$/.test(token)&&!['meta','link','img','br','input','hr'].includes(tag))stack.push(n);}
 else if(token.trim())stack.at(-1).children.push(decode(token.trim()));
}
const ids=['bi8Au','uYGzD','C5tZxu','DUfwI','KNuM1','nqETx','NuLlW'];const screens={};const names=[];
function walk(n){if(typeof n==='string')return;if(ids.includes(n.attrs['data-pencil-id']))screens[n.attrs['data-pencil-id']]=n;if(n.attrs['data-pencil-name'])names.push([n.attrs['data-pencil-id'],n.attrs['data-pencil-name']]);n.children.forEach(walk);}walk(root);
fs.writeFileSync('app/design.json',JSON.stringify(screens));fs.writeFileSync('.sites-runtime/design-names.json',JSON.stringify(names,null,2));console.log('Extracted '+Object.keys(screens).length+' design screens, '+names.length+' named elements');

