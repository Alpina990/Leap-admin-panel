import {createHash} from 'node:crypto';
import {z} from 'zod';
const count=z.number().int().nonnegative().safe();
const learnerId=z.string().regex(/^-?\d{1,19}$/).refine(v=>BigInt(v)>=-(2n**63n)&&BigInt(v)<2n**63n);
const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/);
const timestamp=z.string().datetime({offset:true});
const reason=z.string().min(20).max(1000).refine(v=>v.trim().length>=20);
const base={requestId:z.string().uuid(),baseVersion:count};
const grantInput=z.object({...base,learnerId,reason}).strict();
const catalog=z.object({learnerId,scope:z.literal('whole_catalog'),source:z.string().max(40),reason:z.string().max(1000),version:count,grantedAt:timestamp,expiresAt:timestamp.nullable().optional(),revokedAt:timestamp.nullable()}).strict();
const caseSchema=z.object({id,learnerId,orderId:z.string().min(1).max(36).nullable(),status:z.enum(['open','closed']),issue:z.string().max(500),closureNote:z.string().max(1000).nullable(),version:count,createdAt:timestamp,closedAt:timestamp.nullable()}).strict();
const receipt=z.object({filename:z.string().min(1).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._ -]{0,179}$/),contentType:z.enum(['application/pdf','image/jpeg','image/png']),base64:z.string().min(4).max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict().superRefine((value,ctx)=>{
 const bytes=Buffer.from(value.base64,'base64');
 const canonical=bytes.toString('base64');
 const magic={
  'application/pdf':Buffer.from('%PDF-'),
  'image/jpeg':Buffer.from([0xff,0xd8,0xff]),
  'image/png':Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
 }[value.contentType];
 if(canonical!==value.base64||bytes.byteLength>2*1024*1024||bytes.byteLength<magic.byteLength||!bytes.subarray(0,magic.byteLength).equals(magic))ctx.addIssue({code:z.ZodIssueCode.custom,path:['base64'],message:'Receipt content is invalid.'});
});
const paidAt=timestamp.refine(value=>Date.parse(value)<=Date.now());
const saleInput=z.object({...base,learnerId,reason,amountTiyin:z.string().regex(/^[1-9]\d{0,15}$/),provider:z.enum(['card_transfer','hamkorbank_transfer','payme','click','uzum','paylov']),paidAt,crmReference:id.nullable().optional(),receipt:receipt.nullable().optional()}).strict();
const transaction=z.object({id:z.string().uuid(),learnerId,amountTiyin:z.string().regex(/^[1-9]\d{0,15}$/),currency:z.literal('UZS'),method:z.string().max(32),paidAt:timestamp,crmReference:id.nullable(),receiptAvailable:z.boolean(),receiptFilename:z.string().min(1).max(180).nullable(),receiptContentType:z.enum(['application/pdf','image/jpeg','image/png']).nullable(),receiptSha256:z.string().regex(/^[0-9a-f]{64}$/).nullable(),version:z.literal(1),deletedAt:z.null()}).strict().superRefine((value,ctx)=>{
 const complete=value.receiptFilename!==null&&value.receiptContentType!==null&&value.receiptSha256!==null;
 const empty=value.receiptFilename===null&&value.receiptContentType===null&&value.receiptSha256===null;
 if((value.receiptAvailable&&!complete)||(!value.receiptAvailable&&!empty))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Receipt metadata is inconsistent.'});
});
const saleCatalog=catalog.extend({source:z.literal('admin_crm'),expiresAt:timestamp});
const accessOnlyGrant=catalog.extend({source:z.literal('admin_lifetime'),expiresAt:timestamp,accessState:z.literal('lifetime'),accessOverride:z.literal(false),preservedSectionEntitlements:z.array(z.string().max(120)).max(10000)});
const saleGrant=z.object({transaction,catalogGrant:saleCatalog,accessState:z.literal('lifetime'),accessOverride:z.literal(false)}).strict();
function annualExpirationInstant(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})(T.*)$/.exec(value);
 if(!match)return Number.NaN;
 const nextYear=Number(match[1])+1,month=Number(match[2]);
 const day=Math.min(Number(match[3]),new Date(Date.UTC(nextYear,month,0)).getUTCDate());
 return Date.parse(`${String(nextYear).padStart(4,'0')}-${match[2]}-${String(day).padStart(2,'0')}${match[4]}`);
}
function receiptIdentity(transaction,receipt){
 if(receipt==null)return transaction.receiptAvailable===false&&transaction.receiptFilename===null&&transaction.receiptContentType===null&&transaction.receiptSha256===null;
 const digest=createHash('sha256').update(Buffer.from(receipt.base64,'base64')).digest('hex');
 return transaction.receiptAvailable===true&&transaction.receiptFilename===receipt.filename.trim()&&transaction.receiptContentType===receipt.contentType&&transaction.receiptSha256===digest;
}
export const businessInputs={
 'business-revoke':z.object({...base,learnerId,reason,password:z.string().min(1).max(256)}).strict(),
 'business-grant':z.union([grantInput,saleInput]),
 'business-delete-transaction':z.object({requestId:z.string().uuid(),transactionId:z.string().uuid(),baseVersion:z.number().int().positive().safe(),reason,password:z.string().min(1).max(256)}).strict(),
 'business-close':z.object({...base,caseId:id,note:reason}).strict(),
 'business-intervention':z.object({...base,learnerId,reason,taskTitle:z.string().min(3).max(180).refine(v=>v.trim().length>=3),dueAt:timestamp.nullable().optional()}).strict(),
};
const permissions=z.object({canGrantCatalogAccess:z.boolean(),canCloseReconciliation:z.boolean(),canCreateIntervention:z.boolean(),canWithdrawRevenue:z.boolean()}).strict();
export const businessSchemas={
 'business-permissions':permissions,
 'business-state':z.object({learnerId,catalogGrant:catalog.nullable(),accessState:z.enum(['lifetime','no_access']),accessVersion:count,accessOverride:z.boolean(),followUpVersion:count,permissions,followUpTasks:z.array(z.object({id:z.string().uuid(),learnerId,title:z.string().max(180),status:z.enum(['open','closed']),reason:z.string().max(1000),dueAt:timestamp.nullable(),version:count,createdAt:timestamp}).strict()).max(100)}).strict(),
 'business-cases':z.object({items:z.array(caseSchema).max(100),total:count,limit:z.number().int().min(1).max(100),offset:count,hasMore:z.boolean()}).strict(),
 'business-grant':z.union([accessOnlyGrant,saleGrant]),
 'business-delete-transaction':z.object({transactionId:z.string().uuid(),deletedAt:timestamp,version:z.number().int().min(2).safe(),accessUnchanged:z.literal(true)}).strict(),
 'business-revoke':catalog.extend({revokedAt:timestamp,accessState:z.literal('no_access'),accessOverride:z.literal(true)}),
 'business-close':caseSchema,
 'business-intervention':z.object({note:z.object({id:z.string().uuid(),learnerId,actor:z.string().max(64),note:z.string().max(2000)}).strict(),task:z.object({id:z.string().uuid(),learnerId,title:z.string().min(3).max(180),status:z.literal('open'),reason:z.string().max(1000),dueAt:timestamp.nullable(),version:count}).strict()}).strict(),
};
export function businessPath(action,body){return action==='business-permissions'?'business/permissions':action==='business-state'?'business/learner-state':action==='business-cases'?'business/reconciliation-cases':action==='business-revoke'?'business/catalog-revocations':action==='business-grant'?(Object.hasOwn(JSON.parse(body),'amountTiyin')?'business/catalog-sales':'business/catalog-grants'):action==='business-delete-transaction'?`business/manual-transactions/${encodeURIComponent(JSON.parse(body).transactionId)}/delete`:action==='business-intervention'?'business/interventions':`business/reconciliation-cases/${encodeURIComponent(JSON.parse(body).caseId)}/close`;}
export function businessIdentity(action,data,input,query){
 if(action==='business-permissions')return true;
 if(action==='business-state')return data.learnerId===query.get('learnerId');
 if(action==='business-cases')return data.limit===Number(query.get('limit')??25)&&data.offset===Number(query.get('offset')??0)&&data.items.length<=data.limit;
 const body=JSON.parse(input);
 if(action==='business-revoke')return data.learnerId===body.learnerId&&data.reason===body.reason.trim()&&data.version===body.baseVersion+1;
 if(action==='business-grant')return Object.hasOwn(body,'amountTiyin')?data.transaction?.learnerId===body.learnerId&&data.transaction.amountTiyin===body.amountTiyin&&data.transaction.method===body.provider&&data.transaction.crmReference===(body.crmReference??null)&&Date.parse(data.transaction.paidAt)===Date.parse(body.paidAt)&&receiptIdentity(data.transaction,body.receipt??null)&&data.transaction.version===1&&data.transaction.deletedAt===null&&data.catalogGrant.learnerId===body.learnerId&&data.catalogGrant.source==='admin_crm'&&data.catalogGrant.reason===body.reason.trim()&&data.catalogGrant.version===body.baseVersion+1&&Date.parse(data.catalogGrant.grantedAt)===Date.parse(body.paidAt)&&Date.parse(data.catalogGrant.expiresAt)===annualExpirationInstant(body.paidAt)&&data.catalogGrant.revokedAt===null:data.learnerId===body.learnerId&&data.source==='admin_lifetime'&&data.reason===body.reason.trim()&&data.version===body.baseVersion+1&&data.revokedAt===null&&data.accessState==='lifetime'&&data.accessOverride===false;
 if(action==='business-delete-transaction')return data.transactionId===body.transactionId&&data.version===body.baseVersion+1&&data.accessUnchanged===true;
 if(action==='business-close')return data.id===body.caseId&&data.status==='closed'&&data.closureNote===body.note.trim()&&data.version===body.baseVersion+1&&data.closedAt!==null;
 return data.note.learnerId===body.learnerId&&data.task.learnerId===body.learnerId&&data.task.version===body.baseVersion+1&&data.task.reason===body.reason.trim()&&data.task.title===body.taskTitle.trim();
}
