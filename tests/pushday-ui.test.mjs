import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('refresh retains only same-query data and clears identities when the query changes', async () => {
  assert.ok(existsSync('lib/read-state.mjs'), 'missing query-safe refresh state');
  const {readState} = await import('../lib/read-state.mjs');
  const previous = {key: '/learners:0', path: '/learners', data: {items: ['a']}, syncedAt: 'observed'};
  assert.equal(readState(previous, '/learners', 1).data, previous.data);
  assert.equal(readState(previous, '/learners', 1).loading, true);
  assert.equal(readState(previous, '/learners?username=b', 1).data, undefined);
  assert.equal(readState(previous, null, 1).data, undefined);
});

test('sign in uses the PushDay card with bottom actions', () => {
  const login = read('app/login/sign-in.tsx');
  assert.match(login, /pd-login/);
  assert.match(login, /pd-dialog-actions/);
  assert.doesNotMatch(login, /pencil/i);
});

test('canonical PushDay navigation is reused by the admin shell', () => {
  assert.ok(existsSync('app/pushday-navigation.tsx'), 'missing canonical navigation');
  const navigation = read('app/pushday-navigation.tsx');
  assert.match(read('app/admin-app.tsx'), /<PushdayNavigation/);
  for (const label of ['Boshqaruv', 'Foydalanuvchilar', 'Content', 'To‘lovlar', 'AI', 'Xabarnoma']) {
    assert.match(navigation, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(navigation, /Maqsadlar|Ilova/);
});

test('unsupported workflows preserve safe shells but never sample values or success states', () => {
  assert.ok(existsSync('lib/pushday-workflows.json'), 'missing safe workflow shells');
  const cards = JSON.parse(read('lib/pushday-workflows.json'));
  assert.ok(cards['Date range']);
  assert.ok(cards['Manage access']);
  assert.ok(cards['Create lesson']);
  assert.equal(cards['Changes saved'], undefined);
  assert.equal(cards['Ready to publish'], undefined);
  assert.doesNotMatch(JSON.stringify(cards), /Madina|1,200,000|pay_01|34 \/ 50/);
});

test('shared search and device preferences use the new read-only surface', () => {
  const ui = read('app/admin-app.tsx');
  assert.match(ui, /globalQuery/);
  assert.match(ui, /pd-search-results/);
  assert.match(ui, /leap-auto-refresh/);
  assert.match(ui, /Qidiruv/);
});

test('users surface includes period filtering, payment totals and manual PRO access', () => {
  const ui = read('app/admin-app.tsx');
  assert.match(ui, /PeriodBar/);
  assert.match(ui, /To‘lovlar","Jami/);
  assert.match(ui, /PRO qilish/);
  assert.match(ui, /catalogAccess===true/);
  assert.match(ui, /<StatusPill tone="success">PRO<\/StatusPill>/);
  assert.match(ui, /learner-payments/);
  assert.match(read('app/pushday.css'), /\.pd-period-bar/);
});

test('user metric cards filter the directory by audience', () => {
  const ui = read('app/admin-app.tsx');
  assert.match(ui, /type AudienceFilter=/);
  assert.match(ui, /changeAudience/);
  assert.match(ui, /aria-pressed=\{active\}/);
  assert.match(ui, /filter:"all"/);
  assert.match(ui, /filter:"active"/);
  assert.match(ui, /filter:"access"/);
  assert.match(ui, /filter:"attention"/);
  assert.match(ui, /audience,\.\.\.dateRange/);
  assert.match(read('app/pushday.css'), /button\.pd-metric-card\.active/);
});

test('commerce reuses the period bar, provider distribution and the shared learner drawer', () => {
  const ui = read('app/admin-app.tsx');
  assert.match(ui, /Daromad taqsimoti/);
  assert.match(ui, /paymentMethods/);
  assert.match(ui, /providerLabel/);
  assert.match(ui, /LearnerDetailDrawer/);
  assert.match(ui, /pd-person-link/);
  assert.match(read('app/pushday.css'), /\.pd-profile-drawer/);
});

test('PRO access dialog mirrors the PushDay single-select confirmation flow', () => {
  const dialog = read('app/business-dialog.tsx');
  assert.match(dialog, /PRO qilish/);
  assert.match(dialog, /aria-label="Tarif"/);
  assert.match(dialog, /1 yillik obuna/);
  assert.match(dialog, /Obunani bekor qilish/);
  assert.match(dialog, /pd-pro-dialog/);
  assert.match(dialog, /'Tasdiqlash'/);
  assert.match(dialog, /'Bekor qilish'/);
  assert.match(dialog, /'Saqlanmoqda…'/);
  assert.match(dialog, /'Qayta urinish'/);
  assert.doesNotMatch(dialog, /Lifetime access|No access/);
  assert.match(read('app/pushday.css'), /\.pd-dialog\.pd-pro-dialog/);
});

test('content uses a course-unit-lesson tree with add and edit actions but no delete', () => {
  const ui = read('app/admin-app.tsx');
  const dialog = read('app/content-structure-dialog.tsx');
  assert.match(ui, /content-tree/);
  assert.match(ui, /Kontent daraxti/);
  assert.match(ui, /Kurs qo‘shish/);
  assert.match(ui, /Unit qo‘shish/);
  assert.match(ui, /Dars qo‘shish/);
  assert.match(dialog, /content-structure-write/);
  assert.doesNotMatch(dialog, /delete|o‘chirish|Trash2/i);
});

test('Selfingo management settings reflect the real coming-soon tutor surface', () => {
  const ui = read('app/selfingo-screen.tsx');
  assert.match(ui, /Selfingo/);
  assert.match(ui, /Tez kunda/);
  assert.match(ui, /99 000 so‘m/);
  assert.match(ui, /leap-selfingo-settings/);
  assert.match(ui, /Savol-javob/);
  assert.match(ui, /Speaking/);
});
