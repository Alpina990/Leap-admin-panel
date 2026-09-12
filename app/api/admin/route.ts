import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {seedData,type AdminData,type Lesson} from '@/lib/admin-data';
import {z} from 'zod';
export const dynamic='force-dynamic';
const lessonSchema=z.object({blockOrder:z.array(z.enum(['Video lesson','Key phrases','Quick check','Lesson navigation'])).length(4).refine(a=>new Set(a).size===4).optional(),id:z.string().min(1).max(80),title:z.string().trim().min(1).max(120),course:z.enum(['Foundation','Self-study Assistant','Advanced Vocabulary','Extra Lessons']),unit:z.number().int().min(1).max(100),objective:z.string().trim().min(1).max(2000),passScore:z.number().int().min(0).max(100),status:z.enum(['Draft','In review','Published']),video:z.string().max(1000),phrases:z.string().max(10000),questions:z.string().max(10000),updated:z.string()});
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('note'),learnerId:z.string(),text:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('access'),learnerId:z.string(),access:z.enum(['Lifetime','2 sections','No access']),reason:z.string().trim().min(5).max(1000),confirmed:z.literal(true)}),
 z.object({action:z.literal('saveLesson'),lesson:lessonSchema}),
 z.object({action:z.literal('importLessons'),lessons:z.array(lessonSchema).min(1).max(100)}),
 z.object({action:z.literal('publish'),lessonId:z.string()}),
 z.object({action:z.literal('resolveCase'),caseId:z.string(),reason:z.string().trim().min(5).max(1000),confirmed:z.literal(true)})]);
async function read(){if(!env.DB)throw new Error('Database unavailable');await env.DB.prepare('INSERT OR IGNORE INTO admin_workspace (id,data,revision) VALUES (?,?,1)').bind('leap',JSON.stringify(seedData())).run();const row=await env.DB.prepare('SELECT data,revision FROM admin_workspace WHERE id=?').bind('leap').first<{data:string;revision:number}>();if(!row)throw new Error('Workspace unavailable');return {data:JSON.parse(row.data) as AdminData,revision:row.revision};}
export async function GET(){try{if(!await getChatGPTUser())return Response.json({error:'Access restricted'},{status:403});return Response.json({...await read(),mode:'design-sample',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error('Admin data load failed',e);return Response.json({error:'Couldn’t load data. Please retry.'},{status:503});}}
export async function POST(req:Request){try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Access restricted'},{status:403});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
 const raw=await req.text();if(raw.length>120000)return Response.json({error:'Import is too large'},{status:413});
 const input=JSON.parse(raw);const parsed=command.safeParse(input.command);if(!parsed.success||!Number.isInteger(input.revision))return Response.json({error:parsed.success?'Invalid revision':parsed.error.issues[0].message},{status:400});
 const {data,revision}=await read();if(revision!==input.revision)return Response.json({error:'This record changed. Refresh and review before saving.',conflict:true},{status:409});
 const c=parsed.data;const now=new Date().toISOString();let target='';let reason='';
 if(c.action==='note'||c.action==='access'){const p=data.learners.find(p=>p.id===c.learnerId);if(!p)return Response.json({error:'Learner not found'},{status:404});target=p.id;if(c.action==='note')p.notes.push({text:c.text,at:now,author:user.displayName});else{p.access=c.access;reason=c.reason;}}
 if(c.action==='saveLesson'){target=c.lesson.id;const existing=data.lessons.findIndex(l=>l.id===c.lesson.id);const lesson={...c.lesson,status:existing<0?'Draft':'In review',updated:now};if(existing<0)data.lessons.push(lesson);else data.lessons[existing]=lesson;}
 if(c.action==='importLessons'){const seen=new Set(data.lessons.map(l=>l.id));for(const lesson of c.lessons){if(seen.has(lesson.id))return Response.json({error:'Duplicate lesson ID: '+lesson.id},{status:409});seen.add(lesson.id);}data.lessons.push(...c.lessons.map(l=>({...l,status:'Draft',updated:now})));target=c.lessons.map(l=>l.id).join(',');}
 if(c.action==='publish'){const lesson=data.lessons.find(l=>l.id===c.lessonId);if(!lesson)return Response.json({error:'Lesson not found'},{status:404});if(lesson.passScore<1||lesson.passScore>100||!lesson.title||!lesson.objective||!lesson.questions.trim())return Response.json({error:'Publish blocked. Check metadata, quiz questions and pass score (1–100).'},{status:422});lesson.status='Published';lesson.updated=now;target=lesson.id;}
 if(c.action==='resolveCase'){const item=data.cases.find(x=>x.id===c.caseId);if(!item||item.resolved)return Response.json({error:'Case already resolved or missing'},{status:409});if(item.title==='Paid without entitlement'){const order=data.orders.find(o=>o.id===item.orderId);const p=data.learners.find(l=>l.id===item.learnerId);if(!order||order.status!=='Paid'||!p||p.access!=='No access')return Response.json({error:'Evidence changed. Review the payment and access state.'},{status:409});p.access='Lifetime';}item.resolved=true;target=item.id;reason=c.reason;}
 data.audit.push({id:crypto.randomUUID(),at:now,actor:user.displayName,action:c.action,target,reason});
 const result=await env.DB!.prepare('UPDATE admin_workspace SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(data),'leap',revision).run();if(result.meta.changes!==1)return Response.json({error:'Another administrator updated this workspace. Refresh and retry.'},{status:409});
 return Response.json({data,revision:revision+1,updatedAt:now},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Admin save failed',e);return Response.json({error:'Could not save. Your changes have been kept; please retry.'},{status:503});}}

