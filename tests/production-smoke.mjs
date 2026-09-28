// Real production Next -> fixed FastAPI -> disposable SQLite, over browser HTTPS.
// No API interception, route mocks, live accounts, deployment or dotenv reads.
import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import net from 'node:net';

const backend = process.argv[2];
if (!backend) throw new Error('Pass the backend apps/api directory (read only).');

const children = [];
const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'leap-bff-smoke-'));

async function unusedPort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

function start(command, args, env = process.env) {
  const child = spawn(command, args, {env, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  child.on('error', error => { output += error.message; });
  children.push(child);
  return () => output;
}

async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(500)});
      if (response.status < 500) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Local service did not become ready: ${url}`);
}

let browser;
try {
  for (const port of [8123, 3100, 3443]) await unusedPort(port);
  mkdirSync('work/smoke', {recursive: true});

  const apiLogs = start(resolve(backend, '.venv/Scripts/python.exe'), ['tests/real-backend.py', backend, fixtureRoot]);
  try {
    await ready('http://127.0.0.1:8123/api/v1/admin/session');
  } catch (error) {
    console.error(apiLogs());
    throw error;
  }

  const nextLogs = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    LEAP_ADMIN_API_URL: 'http://127.0.0.1:8123',
    LEAP_ADMIN_ORIGIN: 'https://localhost:3443',
  });
  try {
    await ready('http://127.0.0.1:3100/login');
  } catch (error) {
    console.error(nextLogs());
    throw error;
  }
  start(process.execPath, ['tests/tls-proxy.mjs', 'work/smoke/key.pem', 'work/smoke/cert.pem']);

  browser = await chromium.launch({channel: 'msedge', headless: true});
  const context = await browser.newContext({ignoreHTTPSErrors: true, baseURL: 'https://localhost:3443', viewport: {width: 1440, height: 1000}});
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/login');

  const spoof = {
    'oai-authenticated-user-id': 'owner',
    'oai-authenticated-user-email': 'owner@example.test',
    Authorization: 'Bearer forged',
  };
  const slashOverview = await context.request.get('/api/admin/overview/', {headers: spoof, maxRedirects: 0});
  assert.match(slashOverview.headers()['cache-control'] ?? '', /no-store/);
  assert.equal(slashOverview.status(), 401);
  assert.equal(slashOverview.headers().location, undefined);
  for (const path of ['/api/admin/unknown/', '/api/admin/overview/extra/']) {
    const response = await context.request.get(path, {headers: spoof, maxRedirects: 0});
    assert.equal(response.status(), 404);
    assert.match(response.headers()['cache-control'], /no-store/);
  }
  const slashPost = await context.request.post('/api/admin/overview/', {headers: spoof, maxRedirects: 0});
  assert.equal(slashPost.status(), 405);
  assert.match(slashPost.headers()['cache-control'], /no-store/);
  for (const path of ['/api/admin/session', '/api/admin/overview', '/api/admin/learners']) {
    const response = await context.request.get(path, {headers: spoof});
    assert.equal(response.status(), 401);
    assert.match(response.headers()['cache-control'], /no-store/);
  }
  const protectedPage = await context.request.get('/', {headers: spoof, maxRedirects: 0});
  assert.equal(protectedPage.status(), 307);
  assert.equal(protectedPage.headers().location, '/login');
  const missingOrigin = await context.request.post('/api/admin/login', {
    headers: {'X-Admin-CSRF': 'login'},
    data: {username: 'smoke_operator', password: 'disposable-test-only-password-92!'},
  });
  assert.equal(missingOrigin.status(), 403);

  await page.getByLabel('Username', {exact: true}).fill('smoke_operator');
  await page.getByLabel('Password', {exact: true}).fill('disposable-test-only-password-92!');
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page.locator('.pd-app')).toBeVisible();
  await expect(page.locator('.pd-page-header h1')).toHaveText('Boshqaruv');
  await expect(page.locator('.pd-metric-card')).toHaveCount(4);
  await expect(page.locator('[data-learner-id]')).toHaveCount(5);

  const cookies = await context.cookies();
  assert.equal(cookies.length, 1);
  const cookie = cookies[0];
  assert.equal(cookie.name, '__Host-leap_admin');
  assert.equal(cookie.secure, true);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Strict');
  assert.equal(cookie.path, '/');
  assert.equal(cookie.domain, 'localhost');
  assert.equal(await page.evaluate(() => document.cookie), '');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'leap-theme')), []);

  const counts = await context.request.get('/api/admin/overview');
  assert.deepEqual(await counts.json(), {learnersTotal: 27, coursesTotal: 0, sectionsTotal: 0, lessonsTotal: 0});
  const authenticatedSlash = await context.request.get('/api/admin/overview/', {maxRedirects: 0});
  assert.equal(authenticatedSlash.status(), 200);
  assert.match(authenticatedSlash.headers()['cache-control'], /no-store/);
  assert.deepEqual(await authenticatedSlash.json(), await counts.json());

  await expect(page.locator('html')).toHaveClass(/light/);
  await page.getByRole('button', {name: 'Switch to dark mode', exact: true}).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', {name: 'Switch to light mode', exact: true}).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.screenshot({path: 'work/smoke/pushday-overview-light-desktop.png', fullPage: true});

  const routes = [
    ['overview', 'Boshqaruv', 'Overview'],
    ['learners', 'Foydalanuvchilar', 'Learners'],
    ['content', 'Content', 'Content'],
    ['commerce', 'To‘lovlar', 'Commerce'],
    ['ai', 'Selfingo', 'AI'],
    ['messages', 'Xabarnoma', 'Messages'],
  ];
  for (const [slug, heading, route] of routes) {
    await page.evaluate(value => { location.hash = value; scrollTo(0, 0); }, slug);
    await expect(page.locator('.pd-page-header h1')).toHaveText(heading);
    await expect(page.locator('main')).toHaveAttribute('data-route', route);
    await expect(page.locator('.design-screen')).toHaveCount(0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${slug}: desktop overflow`);
    await page.screenshot({path: `work/smoke/pushday-${slug}-light-desktop.png`, fullPage: true});
  }

  await page.evaluate(() => { location.hash = 'learners'; });
  await expect(page.locator('[data-learner-id]')).toHaveCount(25);
  await page.getByLabel('Foydalanuvchi username', {exact: true}).fill('Exact_Case');
  await page.getByLabel('Foydalanuvchi username', {exact: true}).press('Enter');
  await expect(page.locator('[data-learner-id]')).toHaveCount(1);
  await expect(page.locator('[data-learner-id]')).toHaveAttribute('data-learner-id', '9007199254740993');
  await page.locator('[data-learner-id] .pd-person').click();
  const profileDrawer = page.locator('.pd-profile-drawer');
  await expect(profileDrawer).toBeVisible();
  await expect(profileDrawer).toContainText('9007199254740993');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Qidiruvni tozalash', exact: true}).click();
  await expect(page.locator('[data-learner-id]')).toHaveCount(25);
  await page.getByRole('button', {name: 'Keyingi sahifa', exact: true}).click();
  await expect(page.locator('[data-learner-id]')).toHaveCount(2);

  await page.getByRole('button', {name: 'Boshqaruv', exact: true}).click();
  await page.getByRole('button', {name: 'Foydalanuvchilar', exact: true}).click();
  await expect(page.locator('[data-learner-id]')).toHaveCount(25);
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.locator('[data-learner-id]')).toHaveCount(25);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'learners: mobile overflow');
  await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Content', exact: true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route', 'Content');
  await page.screenshot({path: 'work/smoke/pushday-content-light-mobile.png', fullPage: true});
  for (const [slug] of routes) {
    await page.evaluate(value => { location.hash = value; }, slug);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${slug}: mobile overflow`);
  }

  await page.setViewportSize({width: 1440, height: 1000});
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Sign in', exact: true})).toBeVisible();
  assert.equal((await context.cookies()).length, 0);
  const replay = await context.request.get('/api/admin/overview', {headers: {Cookie: `${cookie.name}=${cookie.value}`}});
  assert.equal(replay.status(), 401);
  assert.deepEqual(pageErrors, []);
  console.log('PASS PushDay production HTTPS Edge + real FastAPI/SQLite: security boundaries, cookie flags, counts, theme, six routes, exact search, pagination, profile, mobile navigation and logout.');
} finally {
  if (browser) await browser.close();
  await Promise.all(children.reverse().map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
  rmSync(fixtureRoot, {recursive: true, force: true, maxRetries: 20, retryDelay: 250});
}
