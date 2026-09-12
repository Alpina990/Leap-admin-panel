// Local TLS termination only. Not a production server or an auth bypass.
import https from 'node:https';
import http from 'node:http';
import {readFileSync} from 'node:fs';
const server=https.createServer({key:readFileSync(process.argv[2]),cert:readFileSync(process.argv[3])},(request,response)=>{
 const upstream=http.request({hostname:'127.0.0.1',port:3100,path:request.url,method:request.method,headers:request.headers},result=>{
  response.writeHead(result.statusCode,result.headers);result.pipe(response);
 });
 upstream.on('error',()=>{response.writeHead(502,{'Cache-Control':'no-store'});response.end();});
 request.pipe(upstream);
});
server.listen(3443,'127.0.0.1',()=>console.log('Local TLS proxy ready'));
