import 'server-only';
import {z} from 'zod';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const session=z.object({admin:z.object({id:z.number().int().positive().safe(),username:z.string().min(3).max(64)}).strict(),csrfToken:z.string().regex(/^[A-Za-z0-9_-]{1,256}$/)}).strict();
const loginSchema=z.object({username:z.string().min(3).max(64),password:z.string().min(1).max(256)}).strict();
const count=z.number().int().nonnegative().safe();
const overview=z.object({learnersTotal:count,coursesTotal:count,sectionsTotal:count,lessonsTotal:count}).strict();
const nullable=z.string().max(1024).nullable();
const timestamp=z.string().datetime({offset:true});
const directory=z.object({items:z.array(z.object({telegramUserId:z.string().regex(/^-?\d{1,20}$/),username:nullable,firstName:nullable,lastName:nullable,languageCode:nullable,createdAt:timestamp,lastSeenAt:timestamp}).strict()).max(100),total:count,limit:z.number().int().min(1).max(100),offset:z.number().int().min(0).max(1000000),hasMore:z.boolean()}).strict();
const errors={401:['admin_unauthorized','Sign in required or credentials invalid.'],403:['admin_csrf','Request rejected.'],422:['admin_validation','Invalid request.'],429:['admin_rate_limited','Too many attempts. Wait five minutes.']};
const methods={login:'POST',session:'GET',logout:'POST',overview:'GET',learners:'GET'};
function validConfig(config){try{const api=new URL(config.api),origin=new URL(config.origin);return ['http:','https:'].includes(api.protocol)&&api.origin===config.api&&origin.protocol==='https:'&&origin.origin===config.origin;}catch{return false;}}
export function adminCookie(raw){
 if(!raw||raw.length>8192)return null;
 const found=raw.split(';').map(s=>s.trim()).filter(s=>s.startsWith('__Host-leap_admin='));
 return found.length===1&&/^__Host-leap_admin=[A-Za-z0-9_-]{43}$/.test(found[0])?found[0]:null;
}
function failure(status,code,message){return Response.json({error:{code,message}},{status,headers});}
async function bounded(body,max){
 if(!body)return '';
 const reader=body.getReader();let size=0;const chunks=[];
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),8000);});
 try{while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.byteLength;if(size>max)throw new Error('size');chunks.push(value);}return Buffer.concat(chunks).toString('utf8');}
 finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
}
function safeCookie(raw,logout=false){
 if(!raw||raw.length>1024)return false;
 const parts=raw.split(';').map(s=>s.trim());
 if(!(logout?/^__Host-leap_admin=(?:""|)$/:/^__Host-leap_admin=[A-Za-z0-9_-]{43}$/).test(parts[0]))return false;
 const attrs=parts.slice(1).map(s=>s.toLowerCase());
 const required=['httponly','secure','path=/','samesite=strict',logout?'max-age=0':'max-age=28800'];
 return required.every(s=>attrs.includes(s))&&new Set(attrs).size===attrs.length&&(logout?attrs.length===6&&attrs.some(s=>/^expires=\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} gmt$/.test(s)):attrs.length===5);
}
export async function proxyAdmin(request,action,config,fetcher=fetch){
 if(!validConfig(config))return failure(503,'admin_configuration','Administrator service unavailable.');
 if(!Object.hasOwn(methods,action))return failure(404,'admin_not_found','Not found.');
 if(request.method!==methods[action])return failure(405,'admin_method','Method not allowed.');
 const cookie=adminCookie(request.headers.get('cookie'));
 if(action!=='login'&&!cookie)return failure(401,'admin_unauthorized','Sign in required.');
 const outgoing=new Headers();if(cookie)outgoing.set('Cookie',cookie);
 const origin=request.headers.get('origin');
 if(origin!==null&&origin!==config.origin)return failure(403,'admin_csrf','Request rejected.');
 if(request.method==='POST'){
  const csrf=request.headers.get('x-admin-csrf');
  if(origin!==config.origin||!(action==='login'?csrf==='login':/^[A-Za-z0-9_-]{1,256}$/.test(csrf||'')))return failure(403,'admin_csrf','Request rejected.');
  outgoing.set('Origin',origin);outgoing.set('X-Admin-CSRF',csrf);
 }
 const query=new URL(request.url).searchParams;
 for(const [key,value] of query){
  if(action!=='learners'||!['limit','offset','username'].includes(key)||query.getAll(key).length!==1)return failure(422,'admin_validation','Invalid query.');
  if(key==='username'?value.length<1||value.length>64:!/^\d{1,7}$/.test(value)||Number(value)<(key==='limit'?1:0)||Number(value)>(key==='limit'?100:1000000))return failure(422,'admin_validation','Invalid query.');
 }
 let body;
 if(request.method==='POST'){
  let raw;try{raw=await bounded(request.body,8192);}catch(error){return error.message==='timeout'?failure(408,'admin_timeout','Request timed out.'):failure(413,'admin_validation','Request too large.');}
  if(action==='login'){
   if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return failure(422,'admin_validation','JSON required.');
   try{body=JSON.stringify(loginSchema.parse(JSON.parse(raw)));}catch{return failure(422,'admin_validation','Invalid login input.');}
   outgoing.set('Content-Type','application/json');
  }else if(raw)return failure(422,'admin_validation','Logout body must be empty.');
 }
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
 const upstream=await fetcher(config.api+'/api/v1/admin/'+action+(query.size?'?'+query.toString():''),{method:request.method,headers:outgoing,body,redirect:'error',cache:'no-store',signal:controller.signal});
 const setCookie=upstream.headers.get('set-cookie');
 const raw=await bounded(upstream.body,262144);
 if(Object.hasOwn(errors,upstream.status)){
  const data=JSON.parse(raw);const [code,message]=errors[upstream.status];
  if(data?.error?.code!==code||typeof data.error.message!=='string'||data.error.message.length>1024)throw new Error('upstream');
  return failure(upstream.status,code,message);
 }
 if(action==='logout'){
  if(upstream.status!==204||raw||!safeCookie(setCookie,true))throw new Error('upstream');
  return new Response(null,{status:204,headers:{...headers,'Set-Cookie':setCookie}});
 }
 if(upstream.status!==200||!upstream.headers.get('content-type')?.startsWith('application/json'))throw new Error('upstream');
 if(action==='login'?!safeCookie(setCookie):setCookie!==null)throw new Error('upstream');
 const data=(action==='overview'?overview:action==='learners'?directory:session).parse(JSON.parse(raw));
 if(action==='learners'&&(data.limit!==Number(query.get('limit')??25)||data.offset!==Number(query.get('offset')??0)||data.items.length>data.limit))throw new Error('upstream');
 return Response.json(data,{headers:{...headers,...(setCookie?{'Set-Cookie':setCookie}:{})}});
 }catch{return failure(502,'admin_upstream','Administrator service unavailable.');}
 finally{clearTimeout(timer);}
}
