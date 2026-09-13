import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8124',origin:'https://localhost:3444'};
const get=p=>new Request(config.origin+'/api/admin/'+p,{headers:{cookie:'__Host-leap_admin='+'a'.repeat(43)}});
test('notification reads strictly validate private inbox DTOs and query boundaries',async()=>{
 const item={id:'n',learnerId:'9007199254740993',kind:'lesson',title:'Ready',body:'Your lesson',actionPath:'/courses',readAt:null,createdAt:'2026-01-01T00:00:00+00:00'};
 const data={items:[item],total:1,limit:25,offset:0,hasMore:false};
 assert.equal((await proxyAdmin(get('notifications?start=2026-01-01&sort=kind&direction=asc'),'notifications',config,async()=>Response.json(data))).status,200);
 assert.equal((await proxyAdmin(get('notification?notificationId=n'),'notification',config,async()=>Response.json(item))).status,200);
 for(const query of ['start=bad','start=2026-02-30','sort=event_key','kind='+ 'x'.repeat(41),'notificationId=n&notificationId=n'])assert.equal((await proxyAdmin(get('notifications?'+query),'notifications',config)).status,422);
 assert.equal((await proxyAdmin(get('notifications'),'notifications',config,async()=>Response.json({...data,items:[{...item,eventKey:'private'}]}))).status,502);
 assert.equal((await proxyAdmin(get('notification?notificationId=wrong'),'notification',config,async()=>Response.json(item))).status,502);
});
