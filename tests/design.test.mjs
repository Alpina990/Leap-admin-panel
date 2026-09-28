import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the runtime is built exclusively from the new PushDay admin layer', () => {
  assert.match(read('app/page.tsx'), /AdminApp/);
  assert.match(read('app/admin-app.tsx'), /PushdayNavigation/);
  assert.match(read('app/admin-app.tsx'), /pushday-workflows\.json/);
  assert.match(read('app/layout.tsx'), /pushday\.css/);
  for (const removed of [
    'app/leap.tsx',
    'app/leap.css',
    'app/appearance.css',
    'app/admin.css',
    'app/pencil.css',
    'app/operations.css',
    'lib/design-adapter.mjs',
    'lib/design-static-copy.json',
    'lib/pencil-dialogs.json',
  ]) {
    assert.equal(existsSync(new URL(`../${removed}`, import.meta.url)), false, `${removed} must stay removed`);
  }
});

test('the runtime contains no archived design hooks or classes', () => {
  const runtime = [
    read('app/admin-app.tsx'),
    read('app/pushday-navigation.tsx'),
    read('app/pushday.css'),
    read('app/login/sign-in.tsx'),
  ].join('\n');
  assert.doesNotMatch(runtime, /data-pencil|design-screen|adaptDesign|pencil-(?:field|dialog|primary|login|navigation|brand|utilities|account|theme|logout|menu)/);
  assert.doesNotMatch(runtime, /admin-dialog|operations-orders|readonly-facts/);
});

test('the PushDay token system and reusable surfaces remain intact', () => {
  const css = read('app/pushday.css');
  for (const token of [
    '--pd-bg: #f3f5f8',
    '--pd-primary: #059669',
    '--pd-text: #0f172a',
    '--pd-muted: #64748b',
    '--pd-border: rgba(15, 23, 42, 0.08)',
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const surface of ['.pd-topbar', '.pd-page-header', '.pd-metric-grid', '.pd-panel', '.pd-table', '.pd-dialog', '.pd-mobile']) {
    assert.match(css, new RegExp(surface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('unsupported workflows never contain sample business values', () => {
  const cards = JSON.parse(read('lib/pushday-workflows.json'));
  assert.ok(cards['Date range']);
  assert.ok(cards['Manage access']);
  assert.ok(cards['Create lesson']);
  assert.equal(cards['Changes saved'], undefined);
  assert.equal(cards['Ready to publish'], undefined);
  assert.doesNotMatch(JSON.stringify(cards), /Madina|1,200,000|pay_01|34 \/ 50/);
});
