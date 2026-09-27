import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyAdmin} from '../lib/admin-bff.mjs';
const config={api:'http://127.0.0.1:8126',origin:'https://localhost:3446'};
const cookie='__Host-leap_admin='+'a'.repeat(43);
const price={product:'catalog_lifetime',amountUzs:880000,currency:'UZS',version:0,updatedAt:null,updatedBy:null,canWrite:true};
const get=()=>new Request(config.origin+'/api/admin/content-price',{headers:{cookie}});
const post=data=>new Request(config.origin+'/api/admin/content-price',{method:'POST',headers:{cookie,Origin:config.origin,'X-Admin-CSRF':'b'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify(data)});
test('catalog price reads and writes are narrowly validated and audited upstream',async()=>{
 const read=await proxyAdmin(get(),'content-price',config,async()=>Response.json(price));
 assert.equal(read.status,200);assert.deepEqual(await read.json(),price);
 const body={action:'price',requestId:'12345678-1234-1234-1234-123456789012',baseVersion:0,amountUzs:990000};
 const write=await proxyAdmin(post(body),'content-price',config,async(url,init)=>{assert.equal(url,config.api+'/api/v1/admin/content-price');assert.equal(init.headers.get('origin'),config.origin);assert.equal(init.headers.get('x-admin-csrf'),'b'.repeat(64));assert.deepEqual(JSON.parse(init.body),body);return Response.json({...price,amountUzs:990000,version:1});});
 assert.equal(write.status,200);assert.equal((await write.json()).amountUzs,990000);
 assert.equal((await proxyAdmin(post({...body,amountUzs:0}),'content-price',config)).status,422);
 assert.equal((await proxyAdmin(post({...body,product:'section'}),'content-price',config)).status,422);
 assert.equal((await proxyAdmin(new Request(config.origin+'/api/admin/content-price',{method:'POST',headers:{cookie,Origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),'content-price',config)).status,403);
 assert.equal((await proxyAdmin(get(),'content-price',config,async()=>Response.json({...price,product:'section'}))).status,502);
});
