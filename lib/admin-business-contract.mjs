import {z} from 'zod';
const count=z.number().int().nonnegative().safe();
const learnerId=z.string().regex(/^-?\d{1,19}$/).refine(v=>BigInt(v)>=-(2n**63n)&&BigInt(v)<2n**63n);
const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/);
const timestamp=z.string().datetime({offset:true});
const reason=z.string().min(20).max(1000).refine(v=>v.trim().length>=20);
const base={requestId:z.string().uuid(),baseVersion:count};
const catalog=z.object({learnerId,scope:z.literal('whole_catalog'),source:z.string().max(40),reason:z.string().max(1000),version:count,grantedAt:timestamp,revokedAt:timestamp.nullable()}).strict();
const caseSchema=z.object({id,learnerId,orderId:z.string().min(1).max(36).nullable(),status:z.enum(['open','closed']),issue:z.string().max(500),closureNote:z.string().max(1000).nullable(),version:count,createdAt:timestamp,closedAt:timestamp.nullable()}).strict();
export const businessInputs={
 'business-revoke':z.object({...base,learnerId,reason,password:z.string().min(1).max(256)}).strict(),
 'business-grant':z.object({...base,learnerId,reason}).strict(),
 'business-close':z.object({...base,caseId:id,note:reason}).strict(),
 'business-intervention':z.object({...base,learnerId,reason,taskTitle:z.string().min(3).max(180).refine(v=>v.trim().length>=3),dueAt:timestamp.nullable().optional()}).strict(),
};
const permissions=z.object({canGrantCatalogAccess:z.boolean(),canCloseReconciliation:z.boolean(),canCreateIntervention:z.boolean()}).strict();
export const businessSchemas={
 'business-permissions':permissions,
 'business-state':z.object({learnerId,catalogGrant:catalog.nullable(),accessState:z.enum(['lifetime','no_access']),accessVersion:count,accessOverride:z.boolean(),followUpVersion:count,permissions,followUpTasks:z.array(z.object({id:z.string().uuid(),learnerId,title:z.string().max(180),status:z.enum(['open','closed']),reason:z.string().max(1000),dueAt:timestamp.nullable(),version:count,createdAt:timestamp}).strict()).max(100)}).strict(),
 'business-cases':z.object({items:z.array(caseSchema).max(100),total:count,limit:z.number().int().min(1).max(100),offset:count,hasMore:z.boolean()}).strict(),
 'business-grant':catalog.extend({accessState:z.literal('lifetime'),accessOverride:z.literal(false),preservedSectionEntitlements:z.array(z.string().max(120)).max(10000)}),
 'business-revoke':catalog.extend({revokedAt:timestamp,accessState:z.literal('no_access'),accessOverride:z.literal(true)}),
 'business-close':caseSchema,
 'business-intervention':z.object({note:z.object({id:z.string().uuid(),learnerId,actor:z.string().max(64),note:z.string().max(2000)}).strict(),task:z.object({id:z.string().uuid(),learnerId,title:z.string().min(3).max(180),status:z.literal('open'),reason:z.string().max(1000),dueAt:timestamp.nullable(),version:count}).strict()}).strict(),
};
export function businessPath(action,body){return action==='business-permissions'?'business/permissions':action==='business-state'?'business/learner-state':action==='business-cases'?'business/reconciliation-cases':action==='business-revoke'?'business/catalog-revocations':action==='business-grant'?'business/catalog-grants':action==='business-intervention'?'business/interventions':`business/reconciliation-cases/${encodeURIComponent(JSON.parse(body).caseId)}/close`;}
export function businessIdentity(action,data,input,query){
 if(action==='business-permissions')return true;
 if(action==='business-state')return data.learnerId===query.get('learnerId');
 if(action==='business-cases')return data.limit===Number(query.get('limit')??25)&&data.offset===Number(query.get('offset')??0)&&data.items.length<=data.limit;
 const body=JSON.parse(input);
 if(action==='business-revoke')return data.learnerId===body.learnerId&&data.reason===body.reason.trim()&&data.version===body.baseVersion+1;
 if(action==='business-grant')return data.learnerId===body.learnerId&&data.reason===body.reason.trim()&&data.version===body.baseVersion+1&&data.revokedAt===null;
 if(action==='business-close')return data.id===body.caseId&&data.status==='closed'&&data.closureNote===body.note.trim()&&data.version===body.baseVersion+1&&data.closedAt!==null;
 return data.note.learnerId===body.learnerId&&data.task.learnerId===body.learnerId&&data.task.version===body.baseVersion+1&&data.task.reason===body.reason.trim()&&data.task.title===body.taskTitle.trim();
}
