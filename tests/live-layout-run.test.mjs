import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validatePrerequisites, withChildren} from './live-layout-run.mjs';
import {spawnSync} from 'node:child_process';

test('missing TLS and interpreter prerequisites fail before acquisition', () => {
  const directory = mkdtempSync(join(tmpdir(), 'audit-prerequisite-'));
  try {
    for (const missing of ['key', 'cert', 'python']) {
      const config = {key: process.execPath, cert: process.execPath, python: process.execPath, backend: directory};
      config[missing] = join(directory, missing);
      let acquired = false;
      assert.throws(() => { validatePrerequisites(config); acquired = true; }, /Missing prerequisite/);
      assert.equal(acquired, false);
      assert.equal(existsSync(config[missing]), false);
    }
  } finally { rmSync(directory, {recursive:true, force:true}); }
});

test('failed spawn cleans up a previously acquired real child', async () => {
  let running;
  await assert.rejects(withChildren(async start => {
    running = start(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
    await new Promise(resolve => running.once('spawn', resolve));
    start(join(tmpdir(), 'missing-audit-interpreter.exe'), []);
    await new Promise(() => {});
  }), /ENOENT/);
  assert.notEqual(running.exitCode ?? running.signalCode, null);
});

test('runner rejects missing prerequisites before starting a build or servers', () => {
  for (const name of ['PENCIL_AUDIT_TLS_KEY', 'PENCIL_AUDIT_TLS_CERT', 'PENCIL_AUDIT_PYTHON']) {
    const result = spawnSync(process.execPath, ['tests/live-layout-run.mjs'], {
      encoding:'utf8', timeout:5000,
      env:{...process.env, [name]:join(tmpdir(), 'nonexistent-audit-prerequisite')},
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing prerequisite/);
    assert.equal(result.stdout, '');
  }
});

test('unexpected child exit fails promptly and cleans up peers', async () => {
  let running;
  await assert.rejects(withChildren(async start => {
    running = start(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
    start(process.execPath, ['-e', 'process.exit(7)']);
    await new Promise(() => {});
  }), /exited.*7/);
  assert.notEqual(running.exitCode ?? running.signalCode, null);
});