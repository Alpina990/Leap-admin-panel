import {z} from 'zod';
const id=z.string().min(1).max(120),blockId=z.string().min(1).max(180),count=z.number().int().nonnegative().safe();
const page=z.object({total:count,limit:z.number().int().min(1).max(100),offset:count,hasMore:z.boolean()}).strict();
const lesson=z.object({id,unitId:id,title:z.string().max(300),slug:z.string().max(200),status:z.string().max(24),position:z.number().int().positive()}).strict();
const structureVersion=z.string().regex(/^[a-f0-9]{64}$/);
const structureLesson=z.object({id,unitId:id,title:z.string().max(300),slug:z.string().max(200),status:z.string().max(24),position:z.number().int().positive(),version:structureVersion}).strict();
const structureUnit=z.object({id,sectionId:id,sectionTitle:z.string().max(240),title:z.string().max(240),slug:z.string().max(160),subtitle:z.string().max(320),position:z.number().int().positive(),version:structureVersion,lessons:z.array(structureLesson).max(500)}).strict();
const structureCourse=z.object({id,title:z.string().max(240),slug:z.string().max(160),version:structureVersion,units:z.array(structureUnit).max(100)}).strict();
export const contentDetail=z.object({lesson:lesson.extend({blocks:z.array(z.object({id:blockId,type:z.string().max(40),position:z.number().int().positive(),payload:z.record(z.unknown())}).strict()).max(100)}),version:z.string().regex(/^[a-f0-9]{64}$/),issues:z.array(z.string().max(500)).max(101)}).strict();
export const contentTree=page.extend({items:z.array(structureCourse).max(100),canWrite:z.boolean()}).strict();
export const contentStructureResult=z.object({kind:z.enum(['course','unit','lesson']),id,version:structureVersion}).strict();
export const importInput=z.object({manifest:z.record(z.unknown())}).strict();
export const contentPrice=z.object({product:z.literal('catalog_lifetime'),amountUzs:z.number().int().positive().max(100000000),currency:z.literal('UZS'),version:count,updatedAt:z.string().datetime({offset:true}).nullable(),updatedBy:z.string().max(64).nullable(),canWrite:z.boolean()}).strict();
export const contentPriceInput=z.object({action:z.literal('price'),requestId:z.string().uuid(),baseVersion:count,amountUzs:z.number().int().positive().max(100000000)}).strict();
export const contentSchemas={'content-import-review':z.object({digest:z.string().regex(/^[a-f0-9]{64}$/),courseId:id,units:count,lessons:count,blocks:count,issues:z.array(z.string().max(500)).max(100)}).strict(),'content-lesson':contentDetail,'content-write':contentDetail,'content-lessons':page.extend({items:z.array(lesson).max(100)}),'content-catalog':page.extend({items:z.array(z.object({id,title:z.string().max(240),sectionTitle:z.string().max(240),courseTitle:z.string().max(240),lessonCount:count}).strict()).max(100),canWrite:z.boolean()}),'content-tree':contentTree,'content-structure-write':contentStructureResult,'content-price':contentPrice};
const existing={requestId:z.string().uuid(),lessonId:id,baseVersion:z.string().regex(/^[a-f0-9]{64}$/)};
const text=(n)=>z.string().min(1).max(n).refine(v=>v.trim().length>0);
const slug=n=>z.string().min(1).max(n).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const structureExisting={requestId:z.string().uuid(),baseVersion:structureVersion};
export const contentStructureInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('course_create'),requestId:z.string().uuid(),title:text(240),slug:slug(160)}).strict(),
 z.object({...structureExisting,action:z.literal('course_update'),courseId:id,title:text(240),slug:slug(160)}).strict(),
 z.object({action:z.literal('unit_create'),requestId:z.string().uuid(),courseId:id,title:text(240),slug:slug(160),subtitle:z.string().max(320).default('')}).strict(),
 z.object({...structureExisting,action:z.literal('unit_update'),unitId:id,title:text(240),slug:slug(160),subtitle:z.string().max(320)}).strict(),
 z.object({action:z.literal('lesson_create'),requestId:z.string().uuid(),unitId:id,title:text(300),slug:slug(200)}).strict(),
 z.object({...structureExisting,action:z.literal('lesson_update'),lessonId:id,title:text(300),slug:slug(200)}).strict(),
]);
export const contentInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),requestId:z.string().uuid(),unitId:id,title:text(300),slug:z.string().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict(),
 z.object({...existing,action:z.literal('block'),blockType:z.literal('text'),blockId:blockId.nullable().optional(),text:text(10000)}).strict(),
 z.object({...existing,action:z.literal('quiz'),blockId:blockId.nullable().optional(),question:text(1000),answer:text(1000),passPercent:z.number().int().min(1).max(100)}).strict(),
 z.object({...existing,action:z.literal('reorder'),blockIds:z.array(blockId).min(1).max(100)}).strict(),
 z.object({...existing,action:z.literal('navigation'),position:z.number().int().min(1).max(100000)}).strict(),
 z.object({...existing,action:z.literal('publish')}).strict(),
 z.object({...existing,action:z.literal('video'),blockId,durationSeconds:z.number().int().min(1).max(86400),objective:text(1000)}).strict(),
 z.object({action:z.literal('import'),requestId:z.string().uuid(),manifest:z.record(z.unknown()),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
]);
