import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8124',origin:'https://localhost:3444'};
const get=p=>new Request(config.origin+'/api/admin/'+p,{headers:{cookie:'__Host-leap_admin='+'a'.repeat(43)}});
test('reporting preserves server query and bounded export scope',async()=>{
 for(const [resource,sort] of [['learners','telegramUserId'],['payments','amountTiyin'],['notifications','kind']]){
  const query=`sort=${sort}&direction=desc&start=2026-01-01&end=2026-01-31`;
  const r=await proxyAdmin(get(resource+'?'+query),resource,config,async url=>{assert.ok(url.endsWith(query));return Response.json({items:[],total:0,limit:25,offset:0,hasMore:false});});assert.equal(r.status,200);
  const data={csv:'"id"\r\n',resource,scope:'current-page',rowCount:0,total:0,limit:25,offset:0};
  assert.equal((await proxyAdmin(get('export?resource='+resource+'&'+query),'export',config,async()=>Response.json(data))).status,200);
  assert.equal((await proxyAdmin(get('export?resource='+resource),'export',config,async()=>Response.json({...data,resource:'wrong'}))).status,502);
 }
 for(const query of ['resource=secrets','resource=learners&sort=kind','resource=payments&sort=username','resource=learners&start=2026-02-30'])assert.equal((await proxyAdmin(get('export?'+query),'export',config)).status,422);
});
