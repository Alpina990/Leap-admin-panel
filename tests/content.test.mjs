import test from 'node:test';import assert from 'node:assert/strict';import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8125',origin:'https://localhost:3445'};const cookie='__Host-leap_admin='+'a'.repeat(43);
test('content BFF validates authoring identity, operation allowlist and CSRF',async()=>{
 const result={lesson:{id:'l',unitId:'u',title:'Lesson',slug:'lesson',status:'draft',position:1,blocks:[]},version:'a'.repeat(64),issues:[]};
 const body={action:'create',requestId:'12345678-1234-1234-1234-123456789012',unitId:'u',title:'Lesson',slug:'lesson'};
 const request=(data,headers={})=>new Request(config.origin+'/api/admin/content-write',{method:'POST',headers:{cookie,Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 assert.equal((await proxyAdmin(request(body),'content-write',config,async()=>Response.json(result))).status,200);
 assert.equal((await proxyAdmin(request({...body,action:'grant'}),'content-write',config)).status,422);
 assert.equal((await proxyAdmin(request(body,{'X-Admin-CSRF':''}),'content-write',config)).status,403);
 const read=id=>new Request(config.origin+'/api/admin/content-lesson?lessonId='+id,{headers:{cookie}});
 assert.equal((await proxyAdmin(read('l'),'content-lesson',config,async()=>Response.json(result))).status,200);
 assert.equal((await proxyAdmin(read('other'),'content-lesson',config,async()=>Response.json(result))).status,502);
 assert.equal((await proxyAdmin(request({action:'video',requestId:body.requestId,lessonId:'l',baseVersion:'a'.repeat(64),blockId:'b',durationSeconds:60,objective:'Speak'}),'content-write',config,async()=>Response.json(result))).status,200);
 const reviewRequest=new Request(config.origin+'/api/admin/content-import-review',{method:'POST',headers:{cookie,Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify({manifest:{}})});
 assert.equal((await proxyAdmin(reviewRequest,'content-import-review',config,async()=>Response.json({digest:'a'.repeat(64),courseId:'c',units:1,lessons:1,blocks:1,issues:[]}))).status,200);
 assert.equal((await proxyAdmin(request({action:'import',requestId:body.requestId,manifest:{},reviewDigest:'a'.repeat(64)}),'content-write',config,async()=>Response.json(result))).status,200);
});

test('content tree and structure authoring expose add/edit without deletion',async()=>{
 const tree={items:[{id:'c',title:'Course',slug:'course',version:'a'.repeat(64),units:[{id:'u',sectionId:'s',sectionTitle:'Course',title:'Unit',slug:'unit',subtitle:'',position:1,version:'b'.repeat(64),lessons:[{id:'l',unitId:'u',title:'Lesson',slug:'lesson',status:'draft',position:1,version:'c'.repeat(64)}]}]}],total:1,limit:25,offset:0,hasMore:false,canWrite:true};
 const read=new Request(config.origin+'/api/admin/content-tree?limit=25&offset=0',{headers:{cookie}});
 assert.equal((await proxyAdmin(read,'content-tree',config,async()=>Response.json(tree))).status,200);
 const body={action:'course_create',requestId:'12345678-1234-1234-1234-123456789012',title:'Course',slug:'course'};
 const write=data=>new Request(config.origin+'/api/admin/content-structure-write',{method:'POST',headers:{cookie,Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result={kind:'course',id:'c',version:'a'.repeat(64)};
 assert.equal((await proxyAdmin(write(body),'content-structure-write',config,async()=>Response.json(result))).status,200);
 assert.equal((await proxyAdmin(write({...body,action:'course_delete'}),'content-structure-write',config)).status,422);
});
