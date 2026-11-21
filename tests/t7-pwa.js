/* 7) التطبيق المثبّت: ملف التعريف، الأيقونات، عامل الخدمة، والعمل بدون نت مع بقاء البيانات */
const { open, seedState, report, URL_BASE, KEY } = require('./lib');

async function run() {
  const violations = [];
  const lines = [];
  const ok = (cond, msg) => { if (!cond) violations.push(msg); };

  const { browser, context, page, errors } = await open({ serviceWorkers: 'allow' });
  const relative = (u) => typeof u === 'string' && !/^([a-z]+:)?\/\//i.test(u) && !u.startsWith('/');

  /* ملف التعريف والوسوم */
  const head = await page.evaluate(() => ({
    manifest: (document.querySelector('link[rel="manifest"]') || {}).getAttribute ? document.querySelector('link[rel="manifest"]').getAttribute('href') : null,
    apple: [...document.querySelectorAll('link[rel="apple-touch-icon"]')].map((l) => ({ href: l.getAttribute('href'), sizes: l.getAttribute('sizes') })),
    viewport: (document.querySelector('meta[name="viewport"]') || {}).content,
    capable: (document.querySelector('meta[name="apple-mobile-web-app-capable"]') || {}).content,
    statusBar: (document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') || {}).content,
    appleTitle: (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content,
    lang: document.documentElement.lang, dir: document.documentElement.dir
  }));
  ok(relative(head.manifest), 'رابط ملف التعريف مش نسبي: ' + head.manifest);
  ok(/viewport-fit=cover/.test(head.viewport || ''), 'viewport ما فيهش viewport-fit=cover');
  ok(head.capable === 'yes', 'وسم apple-mobile-web-app-capable ناقص');
  ok(head.lang === 'ar' && head.dir === 'rtl', 'lang/dir غلط');
  lines.push(`  الوسوم: manifest="${head.manifest}" | viewport="${head.viewport}" | capable=${head.capable} | status-bar=${head.statusBar} | title=${head.appleTitle}`);

  const manifest = await page.evaluate(async (href) => (await fetch(href)).json(), head.manifest);
  ok(!!manifest.name, 'ملف التعريف: name ناقص');
  ok(!!manifest.short_name, 'ملف التعريف: short_name ناقص');
  ok(manifest.display === 'standalone', 'ملف التعريف: display مش standalone');
  ok(relative(manifest.start_url), 'ملف التعريف: start_url مش نسبي: ' + manifest.start_url);
  ok(relative(manifest.scope), 'ملف التعريف: scope مش نسبي: ' + manifest.scope);
  lines.push(`  ملف التعريف: name="${manifest.name}" short_name="${manifest.short_name}" display=${manifest.display} start_url="${manifest.start_url}" scope="${manifest.scope}" lang=${manifest.lang} dir=${manifest.dir}`);

  /* أبعاد الأيقونات الفعلية */
  const dims = (src) => page.evaluate(async (s) => {
    const res = await fetch(s);
    if (!res.ok) return { status: res.status };
    const bmp = await createImageBitmap(await res.blob());
    return { status: res.status, w: bmp.width, h: bmp.height, type: res.headers.get('content-type') };
  }, src);
  const found = {};
  for (const icon of manifest.icons || []) {
    ok(relative(icon.src), 'مسار أيقونة مش نسبي: ' + icon.src);
    const d = await dims(icon.src);
    const [w, h] = icon.sizes.split('x').map(Number);
    ok(d.status === 200 && d.w === w && d.h === h, `الأيقونة ${icon.src}: المعلن ${icon.sizes} والفعلي ${d.w}x${d.h} (HTTP ${d.status})`);
    found[icon.sizes + (icon.purpose === 'maskable' ? ' maskable' : '')] = true;
    lines.push(`  أيقونة ${icon.src}: معلن ${icon.sizes} (${icon.purpose}) | فعلي ${d.w}x${d.h} | HTTP ${d.status}`);
  }
  ok(found['192x192'], 'أيقونة 192 ناقصة');
  ok(found['512x512'], 'أيقونة 512 ناقصة');
  const apple = head.apple[0];
  ok(!!apple, 'أيقونة الآيفون (apple-touch-icon) ناقصة');
  if (apple) {
    const d = await dims(apple.href);
    ok(relative(apple.href) && d.status === 200 && d.w === 180 && d.h === 180, `أيقونة الآيفون: الفعلي ${d.w}x${d.h} (HTTP ${d.status})`);
    lines.push(`  أيقونة الآيفون ${apple.href}: فعلي ${d.w}x${d.h} | HTTP ${d.status}`);
  }

  /* عامل الخدمة */
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, state: reg.active && reg.active.state, script: reg.active && reg.active.scriptURL };
  });
  ok(sw.state === 'activated' || sw.state === 'activating', 'عامل الخدمة ما تفعّلش: ' + sw.state);
  ok(sw.scope === new URL('./', URL_BASE).href, 'نطاق عامل الخدمة غلط: ' + sw.scope);
  lines.push(`  عامل الخدمة: ${sw.script} | الحالة=${sw.state} | النطاق=${sw.scope}`);

  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  /* قائمة التخزين: كل ملف في القائمة موجود، وكل ملف تحمّله الصفحة مخزّن */
  const cache = await page.evaluate(async () => {
    const src = await (await fetch('sw.js', { cache: 'no-store' })).text();
    const version = (src.match(/const VERSION = '([^']+)'/) || [])[1];
    const firstLine = src.split('\n')[0];
    const names = await caches.keys();
    const c = await caches.open(names[0]);
    const cached = (await c.keys()).map((r) => r.url);
    await document.fonts.ready;
    const used = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin) && !u.endsWith('/sw.js'));
    used.push(location.origin + location.pathname);
    const missing = [...new Set(used)].filter((u) => !cached.includes(u.split('#')[0].split('?')[0]));
    return { version, firstLine, names, count: cached.length, missing, shown: document.getElementById('version').textContent };
  });
  ok(cache.firstLine.startsWith('const VERSION'), 'رقم النسخة مش في أول سطر من sw.js');
  ok(cache.names.length === 1 && cache.names[0] === 'masar-cache-' + cache.version, 'اسم الكاش ما يطابقش النسخة: ' + cache.names.join(','));
  ok(cache.missing.length === 0, 'ملفات تستعملها الصفحة ومش في قائمة التخزين: ' + cache.missing.join(', '));
  lines.push(`  التخزين: ${cache.names.join(',')} | ${cache.count} ملف | ملفات مستعملة وغير مخزنة: ${cache.missing.length}`);

  /* بدون نت: نحفظ بيانات، نقطع النت، نعيد التحميل */
  const state = seedState();
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, state]);
  await context.setOffline(true);
  const before = errors.length;
  for (const path of ['', 'index.html', '#lectures']) {
    await page.goto(URL_BASE + path);
    await page.reload();
    const off = await page.evaluate(async (k) => {
      await document.fonts.ready;
      return {
        online: navigator.onLine,
        title: document.getElementById('screen-title').textContent,
        lectures: document.querySelectorAll('#screen-lectures .lec').length,
        psets: document.querySelectorAll('#screen-psets .pset').length,
        checked: document.querySelectorAll('.check[aria-checked="true"]').length,
        saved: localStorage.getItem(k),
        font: document.fonts.check('16px "IBM Plex Sans Arabic"', 'مسار Aa'),
        css: getComputedStyle(document.getElementById('tabbar')).position
      };
    }, KEY);
    lines.push(`  بدون نت "${path || './'}": online=${off.online} | العنوان="${off.title}" | محاضرات=${off.lectures} | واجبات=${off.psets} | معلَّمة=${off.checked} | الخط محمّل=${off.font} | البيانات باقية=${off.saved === JSON.stringify(state)}`);
    ok(off.online === false, 'المتصفح مش في وضع بدون نت');
    ok(off.lectures === 26 && off.psets === 6, `بدون نت "${path}": الواجهة ما تحمّلتش (${off.lectures} محاضرة)`);
    ok(off.checked === 11, `بدون نت "${path}": التعليمات ما ظهرتش (${off.checked})`);
    ok(off.saved === JSON.stringify(state), `بدون نت "${path}": البيانات تغيّرت أو ضاعت`);
    ok(off.font && off.css === 'fixed', `بدون نت "${path}": الخط أو التنسيق ما تحمّلش`);
  }
  ok(errors.length === before, 'أخطاء أثناء العمل بدون نت: ' + errors.slice(before).join(' | '));

  await browser.close();
  return report('7) التطبيق المثبّت', violations, lines.join('\n'));
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
