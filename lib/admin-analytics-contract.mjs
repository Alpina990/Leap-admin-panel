import {z} from 'zod';
const count=z.number().int().nonnegative().safe();
const text=z.string().max(1024);
const id=z.string().min(1).max(200);
const money=z.string().regex(/^\d{1,40}$/);
const rate=z.number().min(0).max(100).nullable();
const timestamp=z.string().datetime({offset:true});
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const period=z.object({start:day,end:day,timezone:z.literal('UTC')}).strict();
const cohort=z.enum(['all','new','returning']);
const learnerId=z.string().regex(/^-?\d{1,19}$/);
const page={total:count,limit:z.number().int().min(1).max(100),offset:count,hasMore:z.boolean()};
export const analyticsSchemas={
 'analytics-summary':z.object({period,learnersTotal:count,newLearners:count,activeLearners:count,completedLessons:count,completionLearners:count,paidOrders:count,revenueTiyin:money,previousRevenueTiyin:money,currency:z.literal('UZS'),daily:z.array(z.object({date:day,revenueTiyin:money,completedLessons:count}).strict()).max(366),paymentMethods:z.array(z.object({method:text,count,revenueTiyin:money}).strict()).max(100),products:z.array(z.object({sectionId:id,title:text,count,revenueTiyin:money}).strict()).max(100),notificationCreated:count,notificationRead:count,definitions:z.object({revenue:text,activeLearners:text,completedLessons:text,notificationRead:text}).strict()}).strict(),
 'analytics-learning':z.object({period,cohort,funnel:z.array(z.object({stage:text,count}).strict()).max(10),completedLessons:count,completionRate:rate,activeLearners:count,daily:z.array(z.object({date:day,completedLessons:count}).strict()).max(366),assessment:z.object({attempts:count,passed:count,passRate:rate}).strict(),writing:z.object({submissions:count,passed:count,passRate:rate}).strict(),ratings:z.object({count,average:z.number().min(0).max(5).nullable()}).strict(),bottlenecks:z.array(z.object({lessonId:id,title:text,started:count,unfinished:count,completionRate:rate}).strict()).max(10),definitions:z.object({cohort:text,funnel:text,bottlenecks:text,daily:text}).strict()}).strict(),
 'analytics-activity':z.object({period,cohort,...page,items:z.array(z.object({learnerId,username:text.nullable(),lessonId:id,title:text,completedAt:timestamp.nullable(),completed:z.boolean()}).strict()).max(100)}).strict(),
 'analytics-learner':z.object({learnerId,catalogAccess:z.boolean(),sectionAccess:z.array(z.object({sectionId:id,title:text,source:text,grantedAt:timestamp,expiresAt:timestamp.nullable()}).strict()).max(100),startedLessons:count,completedLessons:count,completionRate:rate,...page,items:z.array(z.object({lessonId:id,title:text,sectionId:id,completed:z.boolean(),watchedSeconds:z.number().nonnegative(),durationSeconds:z.number().nonnegative(),updatedAt:timestamp,completedAt:timestamp.nullable()}).strict()).max(100)}).strict(),
};
export const analyticsQueries={'analytics-summary':['start','end'],'analytics-learning':['start','end','cohort'],'analytics-activity':['start','end','cohort','day','activityStatus','limit','offset'],'analytics-learner':['learnerId','limit','offset']};
export function analyticsPath(action,query){if(action==='analytics-learner'){const id=query.get('learnerId');query.delete('learnerId');return 'analytics/learners/'+encodeURIComponent(id);}return 'analytics/'+action.slice(10);}
export function analyticsIdentity(action,data,query){
 if(action==='analytics-learner'&&data.learnerId!==query.get('learnerId'))return false;
 if(['analytics-learner','analytics-activity'].includes(action)&&(data.limit!==Number(query.get('limit')??25)||data.offset!==Number(query.get('offset')??0)||data.items.length>data.limit))return false;
 if(data.cohort&&data.cohort!==(query.get('cohort')??'all'))return false;
 return !data.period||['start','end'].every(k=>!query.has(k)||data.period[k]===query.get(k));
}
