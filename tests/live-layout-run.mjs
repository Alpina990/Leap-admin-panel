import {execFileSync, spawn} from 'node:child_process';
import {mkdirSync, copyFileSync, cpSync, existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';

export function validatePrerequisites(config) {
  for (const name of ['key', 'cert', 'python', 'backend']) {
    assert(existsSync(config[name]), `Missing prerequisite ${name}: ${config[name]}`);
  }
}

export async function withChildren(action) {
  const children = [];
  const controller = new AbortController();
  let fail;
  const failure = new Promise((_, reject) => { fail = reject; });
  function start(command, args, options = {}, expectedExit = false) {
    controller.signal.throwIfAborted();
    const child = spawn(command, args, options);
    children.push(child);
    child.on('error', fail);
    child.on('exit', (code, signal) => {
      if (!controller.signal.aborted && (!expectedExit || code !== 0)) fail(new Error(`${command} exited with ${code ?? signal}`));
    });
    return child;
  }
  try { return await Promise.race([failure, Promise.resolve().then(() => action(start, controller.signal))]); }
  finally {
    controller.abort();
    await Promise.all(children.map(async child => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
      const done = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      const force = setTimeout(() => child.kill('SIGKILL'), 5000);
      try { await done; } finally { clearTimeout(force); }
    }));
  }
}

async function main() {
  const config = {
    key: process.env.PENCIL_AUDIT_TLS_KEY || 'work/smoke/key.pem',
    cert: process.env.PENCIL_AUDIT_TLS_CERT || 'work/smoke/cert.pem',
    python: process.env.PENCIL_AUDIT_PYTHON || resolve('../LeapEnglish/apps/api/.venv/Scripts/python.exe'),
    backend: resolve('../LeapEnglish/apps/api'),
  };
  validatePrerequisites(config);
  // Read/parse TLS before acquiring any children or temporary directories.
  const tlsOptions = {key: readFileSync(config.key), cert: readFileSync(config.cert)};
  const nextPort = Number(process.env.PENCIL_AUDIT_NEXT_PORT || 3107);
  const apiPort = Number(process.env.PENCIL_AUDIT_API_PORT || 8127);
  const base = new URL(process.env.PENCIL_AUDIT_BASE || 'https://localhost:3447');
  assert(base.protocol === 'https:' && ['localhost', '127.0.0.1'].includes(base.hostname) && !base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, 'Audit base must be a loopback HTTPS origin');
  const tlsPort = Number(base.port || 443);
  const ports = [nextPort, apiPort, tlsPort];
  assert(ports.every(port => Number.isInteger(port) && port > 0 && port <= 65535) && new Set(ports).size === 3, 'Audit ports must be distinct valid ports');
  const tls = https.createServer(tlsOptions, (req, res) => {
    const upstream = http.request({hostname:'127.0.0.1', port:nextPort, path:req.url, method:req.method, headers:req.headers}, response => {res.writeHead(response.statusCode, response.headers); response.pipe(res);});
    upstream.on('error', () => {if(res.destroyed)return; if(!res.headersSent)res.writeHead(502); res.end();});
    req.pipe(upstream);
  });
  for (const port of ports) await new Promise((resolve, reject) => {
    const server = net.createServer(); server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
  let fixture, buildDir, logs = '';
  const output = process.env.PENCIL_AUDIT_OUTPUT || 'work/pencil/updated-runtime';
  try {
    fixture = mkdtempSync(resolve(tmpdir(), 'pencil-audit-'));
    mkdirSync('work/live-qa', {recursive:true});
    // A fresh owned directory prevents obsolete tracked files surviving a rebuild.
    buildDir = mkdtempSync(resolve('work/live-qa/build-site-'));
    for (const file of execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0')) {
      if(!file || file.endsWith('.pen') || file.startsWith('work/') || file.startsWith('docs/') || file.startsWith('.env') || !existsSync(file))continue;
      mkdirSync(dirname(buildDir+'/'+file), {recursive:true}); copyFileSync(file, buildDir+'/'+file);
    }
    cpSync('vendor', buildDir+'/vendor', {recursive:true});
    execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', buildDir], {stdio:'inherit', env:{...process.env, NEXT_TELEMETRY_DISABLED:'1'}});
    await withChildren(async (start, signal) => {
      start(config.python, ['tests/live-layout-fixture.py', config.backend, fixture, String(apiPort), base.origin], {stdio:'inherit'});
      const next = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', buildDir, '--hostname', '127.0.0.1', '--port', String(nextPort)], {env:{...process.env, LEAP_ADMIN_API_URL:`http://127.0.0.1:${apiPort}`, LEAP_ADMIN_ORIGIN:base.origin, NEXT_TELEMETRY_DISABLED:'1'}, stdio:['ignore','pipe','pipe']});
      next.stdout.on('data', data => logs += data); next.stderr.on('data', data => logs += data);
      await new Promise((resolve, reject) => {tls.once('error', reject); tls.listen(tlsPort, '127.0.0.1', resolve);});
      for (const [url, status] of [[`http://127.0.0.1:${nextPort}/login`, 200], [`http://127.0.0.1:${apiPort}/api/v1/admin/session`, 401]]) {
        let ready = false;
        for(let i=0; i<100; i++) {
          signal.throwIfAborted();
          try {if((await fetch(url, {signal:AbortSignal.any([signal, AbortSignal.timeout(2000)])})).status === status){ready=true;break;}}catch{}
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        signal.throwIfAborted(); assert(ready, `Readiness failed: ${url}\n${logs}`);
      }
      const child = start(process.execPath, ['tests/live-layout-runtime.mjs'], {env:{...process.env, PENCIL_AUDIT_BASE:base.origin, PENCIL_AUDIT_OUTPUT:output}, stdio:'inherit'}, true);
      const code = await new Promise(resolve => child.once('exit', resolve)); assert.equal(code, 0);
      console.log('PASS isolated updated production runtime audit');
      if(process.env.PENCIL_KEEP_PREVIEW === '1') {
        console.log(`PREVIEW READY ${base.origin}`);
        await new Promise(resolve => {process.once('SIGINT', resolve); process.once('SIGTERM', resolve);});
      }
    });
  } finally {
    tls.closeAllConnections(); await new Promise(resolve => tls.close(resolve));
    if(fixture)rmSync(fixture, {recursive:true, force:true, maxRetries:10, retryDelay:250});
    if(buildDir)rmSync(buildDir, {recursive:true, force:true, maxRetries:10, retryDelay:250});
    mkdirSync(output, {recursive:true}); writeFileSync(output+'/isolated-next.log', logs);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error); process.exitCode = 1;});
}