import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';

const base = new URL(process.env.PENCIL_AUDIT_BASE || 'https://localhost:3447');
assert(base.protocol === 'https:' && ['localhost', '127.0.0.1'].includes(base.hostname) && !base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, 'Audit base must be a loopback HTTPS origin');

const baseURL = base.origin;
const out = process.env.PENCIL_AUDIT_OUTPUT || 'work/pushday/local-runtime';
mkdirSync(out, {recursive: true});

const routes = {
  overview: {route: 'Overview', heading: 'Boshqaruv'},
  learners: {route: 'Learners', heading: 'Foydalanuvchilar'},
  content: {route: 'Content', heading: 'Content'},
  commerce: {route: 'Commerce', heading: 'To‘lovlar'},
  ai: {route: 'AI', heading: 'Selfingo'},
  messages: {route: 'Messages', heading: 'Xabarnoma'},
};

const browser = await chromium.launch({channel: 'msedge', headless: true});
const results = [];
const errors = [];
try {
  const context = await browser.newContext({baseURL, ignoreHTTPSErrors: true, viewport: {width: 1440, height: 1000}});
  const login = await context.request.post('/api/admin/login', {
    headers: {Origin: baseURL, 'X-Admin-CSRF': 'login'},
    data: {username: 'smoke_operator', password: 'disposable-test-only-password-92!'},
  });
  assert.equal(login.status(), 200);

  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');

  await expect(page.locator('.pd-app')).toBeVisible();
  await expect(page.locator('.pd-topbar')).toBeVisible();
  const topbar = await page.locator('.pd-topbar').boundingBox();
  assert.equal(Math.round(topbar.width), 1440);
  assert.equal(Math.round(topbar.height), 60);
  await expect(page.getByRole('heading', {name: 'Boshqaruv', exact: true})).toBeVisible();
  await expect(page.locator('.pd-metric-card')).toHaveCount(4);
  await expect(page.locator('[data-learner-id]')).toHaveCount(5);
  await page.screenshot({path: `${out}/overview-desktop.png`, fullPage: true});

  await page.getByRole('button', {name: 'Search everything', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Qidiruv', exact: true})).toBeVisible();
  await page.getByLabel('Username', {exact: true}).fill('Exact_Case');
  await page.getByRole('button', {name: 'Qidirish', exact: true}).click();
  await expect(page.getByRole('dialog').getByText('@Exact_Case', {exact: true})).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Sozlamalar', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'To‘lovlar', exact: true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route', 'Commerce');
  await expect(page.locator('[data-order-id]')).toHaveCount(25);
  await expect(page.getByLabel('Tezkor davr', {exact: true})).toBeVisible();
  await expect(page.getByText('Daromad taqsimoti', {exact: true})).toBeVisible();
  await page.locator('[data-order-id] .pd-person-link').first().click();
  const drawer=page.locator('.pd-profile-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Ro‘yxatdan o‘tgan', {exact: true})).toBeVisible();
  await page.waitForTimeout(600);
  const drawerBox=await drawer.boundingBox();
  assert(drawerBox && drawerBox.x>=0 && drawerBox.x+drawerBox.width<=1440 && drawerBox.y>=0 && drawerBox.y+drawerBox.height<=1000, 'learner drawer is clipped');
  await page.screenshot({path: `${out}/commerce-learner-drawer-1440.png`});
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Filtr', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'To‘lov filtrlari', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'Content', exact: true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route', 'Content');
  await page.getByRole('button', {name: 'Dars qo‘shish', exact: true}).first().click();
  await expect(page.getByRole('dialog', {name: 'Dars qo‘shish', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'AI', exact: true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route', 'AI');
  await expect(page.locator('.pd-page-header h1')).toHaveText('Selfingo');
  await expect(page.getByText('Tez kunda', {exact: true})).toBeVisible();

  await page.getByRole('button', {name: 'Xabarnoma', exact: true}).click();
  await expect(page.locator('[data-notification-id]')).toHaveCount(25);
  await page.locator('[data-notification-id]').first().click();
  await expect(page.getByRole('dialog').getByRole('heading', {name: /Disposable notification/})).toBeVisible();
  await page.keyboard.press('Escape');

  for (const viewport of [{width: 1440, height: 1000}, {width: 430, height: 900}]) {
    await page.setViewportSize(viewport);
    for (const [slug, route] of Object.entries(routes)) {
      await page.evaluate(value => { location.hash = value; scrollTo(0, 0); }, slug);
      await expect(page.locator('main')).toHaveAttribute('data-route', route.route);
      await expect(page.locator('.pd-page-header h1')).toHaveText(route.heading);
      if (slug === 'overview') await expect(page.locator('[data-learner-id]')).toHaveCount(5);
      if (slug === 'learners') await expect(page.locator('[data-learner-id]')).toHaveCount(25);
      if (slug === 'commerce') await expect(page.locator('[data-order-id]')).toHaveCount(25);
      if (slug === 'messages') await expect(page.locator('[data-notification-id]')).toHaveCount(25);
      const geometry = await page.evaluate(() => ({
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        topbar: document.querySelector('.pd-topbar')?.getBoundingClientRect().width,
        overflow: [...document.querySelectorAll('body *')]
          .map(node => ({
            tag: node.tagName,
            className: typeof node.className === 'string' ? node.className : '',
            parent: `${node.parentElement?.tagName ?? ''}.${typeof node.parentElement?.className === 'string' ? node.parentElement.className : ''}`,
            text: (node.textContent ?? '').trim().slice(0, 90),
            left: Math.round(node.getBoundingClientRect().left),
            right: Math.round(node.getBoundingClientRect().right),
            width: Math.round(node.getBoundingClientRect().width),
          }))
          .filter(node => node.right > innerWidth + 1 || node.left < -1)
          .slice(0, 12),
        panels: [...document.querySelectorAll('.pd-panel')].map(node => ({
          left: node.getBoundingClientRect().left,
          right: node.getBoundingClientRect().right,
        })),
      }));
      assert(geometry.documentWidth <= geometry.viewport, `${slug}: document horizontal overflow ${JSON.stringify(geometry.overflow)}`);
      assert(Math.round(geometry.topbar) === viewport.width, `${slug}: topbar width mismatch`);
      for (const panel of geometry.panels) {
        assert(panel.left >= 0 && panel.right <= viewport.width + 1, `${slug}: panel clipped`);
      }
      await page.screenshot({path: `${out}/${slug}-${viewport.width}.png`, fullPage: true});
      results.push({route: slug, viewport, geometry});
    }
  }

  await page.setViewportSize({width: 430, height: 900});
  await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
  await expect(page.getByRole('dialog').getByRole('button', {name: 'Content', exact: true})).toBeVisible();
  await page.getByRole('dialog').getByRole('button', {name: 'Content', exact: true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route', 'Content');
  assert.deepEqual(errors, []);
  console.log('PASS PushDay production runtime: six routes at desktop/mobile, real FastAPI + disposable SQLite, dialogs/search/navigation, no horizontal overflow or page errors.');
} finally {
  writeFileSync(`${out}/results.json`, JSON.stringify({results, errors}, null, 2));
  await browser.close();
}
