/* أدوات مشتركة لاختبارات مسار. التشغيل:
     python3 -m http.server 8765        (من مجلد المشروع)
     node tests/all.js
   لتجربة رابط آخر: MASAR_URL=https://example.com/app/ node tests/all.js */
const { chromium } = require('playwright');

const URL_BASE = process.env.MASAR_URL || 'http://127.0.0.1:8765/';
const KEY = 'masar-v1';
const VIEWPORT = { width: 390, height: 844 };

/* حالة تجريبية: المحاضرات 1 إلى 11 مكتملة (فتكون الخطوة الجاية هي المحاضرة 12 الطويلة)، وكل حالات الشارات ظاهرة */
function seedState(doneUpTo = 11) {
  const lectures = {};
  for (let i = 1; i <= doneUpTo; i++) lectures[i] = true;
  return { v: 1, lectures, psets: { ps0: 'done', ps1: 'doing' } };
}

async function open(opts = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: opts.viewport || VIEWPORT,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: opts.dpr || 1,
    locale: 'ar',
    acceptDownloads: true,
    serviceWorkers: opts.serviceWorkers || 'block'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  await page.goto(URL_BASE);
  if (opts.state !== undefined) {
    await page.evaluate(([k, s]) => {
      if (s === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(s));
    }, [KEY, opts.state]);
    await page.reload();
  }
  await page.evaluate(() => document.fonts.ready);
  return { browser, context, page, errors };
}

async function gotoTab(page, name) {
  await page.tap(`.tab[data-tab="${name}"]`);
  await page.waitForSelector(`#screen-${name}:not([hidden])`);
}

async function closeSheet(page) {
  if (await page.evaluate(() => document.getElementById('sheet').hidden)) return;
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('sheet').hidden);
}

async function openSheet(page, selector) {
  await page.tap(selector);
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
}

/* يمرّ على كل حالات الواجهة وينادي fn(name) في كل واحدة */
async function eachView(page, fn, opts = {}) {
  const views = [
    ['الرئيسية', async () => { await gotoTab(page, 'home'); }],
    ['المحاضرات', async () => { await gotoTab(page, 'lectures'); }],
    ['المحاضرات (فلتر المكتملة)', async () => { await gotoTab(page, 'lectures'); await page.tap('.chip[data-f="done"]'); }],
    ['الواجبات', async () => { await gotoTab(page, 'psets'); }],
    ['الإعدادات', async () => { await gotoTab(page, 'settings'); }],
    ['ورقة محاضرة', async () => { await gotoTab(page, 'lectures'); await page.tap('.chip[data-f="all"]'); await openSheet(page, '.lec-main[data-id="12"]'); }],
    ['ورقة محاضرة مكتملة', async () => { await gotoTab(page, 'lectures'); await openSheet(page, '.lec-main[data-id="9"]'); }],
    ['ورقة واجب', async () => { await gotoTab(page, 'psets'); await openSheet(page, '.pset-head[data-id="ps1"]'); }],
    ['ورقة تأكيد المسح', async () => { await gotoTab(page, 'settings'); await openSheet(page, '[data-action="ask-clear"]'); }]
  ];
  if (opts.toast) {
    views.push(['رسالة (toast)', async () => {
      await gotoTab(page, 'lectures');
      await page.tap('.check[data-id="12"]');
      await page.waitForSelector('#toast.show');
      await page.waitForTimeout(250);
    }]);
  }
  for (const [name, go] of views) {
    await closeSheet(page);
    await go();
    await fn(name);
  }
  await closeSheet(page);
}

function report(title, violations, extra) {
  console.log('\n=== ' + title + ' ===');
  if (extra) console.log(extra);
  if (violations.length) violations.forEach((v) => console.log('  مخالفة: ' + v));
  console.log('النتيجة: ' + violations.length + ' مخالفة' + (violations.length ? '' : ' (ناجح)'));
  return violations.length;
}

module.exports = { open, gotoTab, openSheet, closeSheet, eachView, seedState, report, URL_BASE, KEY, VIEWPORT };
