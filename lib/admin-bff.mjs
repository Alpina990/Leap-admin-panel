import 'server-only';
import {businessInputs,businessSchemas,businessPath,businessIdentity} from './admin-business-contract.mjs';
import {z} from 'zod';
import {contentSchemas,contentInput,importInput} from './admin-content-contract.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const session=z.object({admin:z.object({id:z.number().int().positive().safe(),username:z.string().min(3).max(64)}).strict(),csrfToken:z.string().regex(/^[A-Za-z0-9_-]{1,256}$/)}).strict();
const loginSchema=z.object({username:z.string().min(3).max(64),password:z.string().min(1).max(256)}).strict();
const count=z.number().int().nonnegative().safe();
const overview=z.object({learnersTotal:count,coursesTotal:count,sectionsTotal:count,lessonsTotal:count}).strict();
const nullable=z.string().max(1024).nullable();
const timestamp=z.string().datetime({offset:true});
const directory=z.object({items:z.array(z.object({telegramUserId:z.string().regex(/^-?\d{1,20}$/),username:nullable,firstName:nullable,lastName:nullable,languageCode:nullable,createdAt:timestamp,lastSeenAt:timestamp}).strict()).max(100),total:count,limit:z.number().int().min(1).max(100),offset:z.number().int().min(0).max(1000000),hasMore:z.boolean()}).strict();
const order=z.object({id:z.string().min(1).max(36),learnerId:z.string().regex(/^-?\d{1,19}$/),sectionId:z.string().max(120),amountTiyin:z.string().regex(/^[1-9]\d{0,18}$/),currency:z.string().length(3),gateway:z.literal('WLCM'),method:z.string().max(20),status:z.string().max(20),createdAt:timestamp,paidAt:timestamp.nullable(),cancelledAt:timestamp.nullable(),externalId:z.string().max(100),gatewayOrderId:z.string().max(100).nullable(),gatewayPaymentId:z.string().max(100).nullable()}).strict();
const notification=z.object({id:z.string().min(1).max(36),learnerId:z.string().regex(/^-?\d{1,19}$/),kind:z.string().max(40),title:z.string().max(180),body:z.string().max(500),actionPath:z.string().max(500).nullable(),createdAt:timestamp,readAt:timestamp.nullable()}).strict();
const notifications=directory.extend({items:z.array(notification).max(100)});
const payments=directory.extend({items:z.array(order).max(100)});
const payment=z.object({order,entitlement:z.object({source:z.string().max(40),grantedAt:timestamp,expiresAt:timestamp.nullable(),revokedAt:timestamp.nullable(),matchesPayment:z.boolean()}).strict().nullable()}).strict();
const note=z.object({id:z.string().uuid(),learnerId:z.string().regex(/^-?\d{1,19}$/),actor:z.string().max(64),note:z.string().min(1).max(2000),createdAt:timestamp}).strict();
const notes=directory.extend({items:z.array(note).max(100)});
const noteInput=z.object({learnerId:z.string().regex(/^-?\d{1,19}$/).refine(v=>BigInt(v)>=-(2n**63n)&&BigInt(v)<2n**63n),note:z.string().min(1).max(2000).refine(v=>v.trim().length>0),requestId:z.string().uuid()}).strict();
const report=z.object({csv:z.string().max(1048576),resource:z.enum(['learners','payments','notifications']),scope:z.literal('current-page'),rowCount:count,total:count,limit:z.number().int().min(1).max(100),offset:count}).strict();
const sortKeys={learners:['telegramUserId','createdAt','lastSeenAt','username'],payments:['createdAt','amountTiyin','status'],notifications:['createdAt','kind']};
const errors={409:['admin_conflict','Record changed or request identifier reused. Review and retry.'],404:['admin_not_found','Record not found.'],401:['admin_unauthorized','Sign in required or credentials invalid.'],403:['admin_csrf','Request rejected.'],422:['admin_validation','Invalid request.'],429:['admin_rate_limited','Too many attempts. Wait five minutes.']};
const methods={'business-permissions':'GET','business-state':'GET','business-cases':'GET','business-grant':'POST','business-close':'POST','business-intervention':'POST',login:'POST',session:'GET',logout:'POST',overview:'GET',learners:'GET',payments:'GET',payment:'GET',notes:'GET,POST',notifications:'GET',notification:'GET',export:'GET','content-catalog':'GET','content-lessons':'GET','content-lesson':'GET','content-write':'POST','content-import-review':'POST'};
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
 if(!methods[action].split(',').includes(request.method))return failure(405,'admin_method','Method not allowed.');
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
 const resource=action==='export'?query.get('resource'):action;
 if(action==='export'&&!Object.hasOwn(sortKeys,resource??''))return failure(422,'admin_validation','Invalid report resource.');
 if(query.get('start')&&query.get('end')&&query.get('start')>query.get('end'))return failure(422,'admin_validation','Invalid date range.');
 for(const [key,value] of query){
  const allowed=action==='business-state'?['learnerId']:action==='business-cases'?['limit','offset']:action==='content-catalog'?['limit','offset']:action==='content-lessons'?['unitId','limit','offset']:action==='content-lesson'?['lessonId']:action==='export'?['resource','limit','offset','start','end','sort','direction',...(resource==='learners'?['username']:resource==='payments'?['status','method','learnerId']:['kind','learnerId'])]:action==='notifications'?['limit','offset','learnerId','kind','start','end','sort','direction']:action==='notification'?['notificationId']:action==='learners'?['limit','offset','username','start','end','sort','direction']:action==='payments'?['limit','offset','status','method','learnerId','start','end','sort','direction']:action==='payment'?['orderId']:action==='notes'&&request.method==='GET'?['learnerId','limit','offset']:[];
  if(!allowed.includes(key)||query.getAll(key).length!==1)return failure(422,'admin_validation','Invalid query.');
  const valid=['unitId','lessonId'].includes(key)?value.length>=1&&value.length<=120:['start','end'].includes(key)?/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value:key==='resource'?Object.hasOwn(sortKeys,value):key==='sort'?(sortKeys[resource]??[]).includes(value):key==='direction'?['asc','desc'].includes(value):key==='kind'?value.length>=1&&value.length<=40:key==='notificationId'?value.length>=1&&value.length<=36:key==='username'?value.length>=1&&value.length<=64:key==='orderId'?value.length>=1&&value.length<=36:key==='status'?['pending','paid','cancelled'].includes(value):key==='method'?['payme','click','uzum','paylov'].includes(value):key==='learnerId'?/^-?\d{1,19}$/.test(value)&&BigInt(value)>=-(2n**63n)&&BigInt(value)<2n**63n:/^\d{1,7}$/.test(value)&&Number(value)>=(key==='limit'?1:0)&&Number(value)<=(key==='limit'?100:1000000);
  if(!valid)return failure(422,'admin_validation','Invalid query.');
 }
 if(action==='business-state'&&!query.has('learnerId'))return failure(422,'admin_validation','Learner identifier required.');
 let body;
 if(request.method==='POST'){
  let raw;try{raw=await bounded(request.body,['content-write','content-import-review'].includes(action)?300000:8192);}catch(error){return error.message==='timeout'?failure(408,'admin_timeout','Request timed out.'):failure(413,'admin_validation','Request too large.');}
  if(Object.hasOwn(businessInputs,action)||action==='login'||action==='notes'||action==='content-write'||action==='content-import-review'){
   if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return failure(422,'admin_validation','JSON required.');
   try{body=JSON.stringify((businessInputs[action]??(action==='content-import-review'?importInput:action==='content-write'?contentInput:action==='login'?loginSchema:noteInput)).parse(JSON.parse(raw)));}catch{return failure(422,'admin_validation','Invalid request input.');}
   outgoing.set('Content-Type','application/json');
  }else if(raw)return failure(422,'admin_validation','Logout body must be empty.');
 }
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
 const upstream=await fetcher(config.api+'/api/v1/admin/'+(Object.hasOwn(businessSchemas,action)?businessPath(action,body):action)+(query.size?'?'+query.toString():''),{method:request.method,headers:outgoing,body,redirect:'error',cache:'no-store',signal:controller.signal});
 const setCookie=upstream.headers.get('set-cookie');
 const raw=await bounded(upstream.body,Object.hasOwn(contentSchemas,action)||action==='export'||action==='notifications'||(action==='notes'&&request.method==='GET')?1048576:262144);
 if(Object.hasOwn(errors,upstream.status)){
  const data=JSON.parse(raw);const [code,message]=errors[upstream.status];
  if(upstream.status===403&&data?.error?.code==='admin_forbidden')return failure(403,'admin_forbidden',Object.hasOwn(businessSchemas,action)?'Permission for this business operation is required.':action==='content-write'?'Content writing permission required.':'Note writing permission required.');
  if(data?.error?.code!==code||typeof data.error.message!=='string'||data.error.message.length>1024)throw new Error('upstream');
  return failure(upstream.status,code,message);
 }
 if(action==='logout'){
  if(upstream.status!==204||raw||!safeCookie(setCookie,true))throw new Error('upstream');
  return new Response(null,{status:204,headers:{...headers,'Set-Cookie':setCookie}});
 }
 if(upstream.status!==200||!upstream.headers.get('content-type')?.startsWith('application/json'))throw new Error('upstream');
 if(action==='login'?!safeCookie(setCookie):setCookie!==null)throw new Error('upstream');
 const data=(businessSchemas[action]??contentSchemas[action]??(action==='export'?report:action==='notifications'?notifications:action==='notification'?notification:action==='overview'?overview:action==='learners'?directory:action==='payments'?payments:action==='payment'?payment:action==='notes'?(request.method==='GET'?notes:note):session)).parse(JSON.parse(raw));
 if((['learners','payments','notifications'].includes(action)||(action==='notes'&&request.method==='GET'))&&(data.limit!==Number(query.get('limit')??25)||data.offset!==Number(query.get('offset')??0)||data.items.length>data.limit))throw new Error('upstream');
 if(Object.hasOwn(businessSchemas,action)&&!businessIdentity(action,data,body,query))throw new Error('upstream identity');
 if(action==='content-lesson'&&data.lesson.id!==query.get('lessonId'))throw new Error('upstream identity');
 if(['content-catalog','content-lessons'].includes(action)&&(data.limit!==Number(query.get('limit')??25)||data.offset!==Number(query.get('offset')??0)||data.items.length>data.limit))throw new Error('upstream page');
 if(action==='content-lessons'&&data.items.some(item=>item.unitId!==query.get('unitId')))throw new Error('upstream identity');
 if(action==='export'&&(data.resource!==resource||data.limit!==Number(query.get('limit')??25)||data.offset!==Number(query.get('offset')??0)||data.rowCount>data.limit||data.rowCount>data.total))throw new Error('upstream report');
 if(action==='notification'&&data.id!==query.get('notificationId'))throw new Error('upstream identity');
 if(action==='notes'&&request.method==='GET'&&data.items.some(n=>n.learnerId!==query.get('learnerId')))throw new Error('upstream identity');
 return Response.json(data,{headers:{...headers,...(setCookie?{'Set-Cookie':setCookie}:{})}});
 }catch{return failure(502,'admin_upstream','Administrator service unavailable.');}
 finally{clearTimeout(timer);}
}
