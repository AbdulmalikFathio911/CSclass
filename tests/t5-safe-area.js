/* 5) الحواف الآمنة: محاكاة آيفون بنتوء (علوي 59، سفلي 34). لا شي تحت النتوء ولا تحت شريط التنقل ولا خط الرجوع */
const { open, gotoTab, openSheet, closeSheet, seedState, report } = require('./lib');

const TOP = 59;
const BOTTOM = 34;

async function run() {
  const { browser, context, page } = await open({ state: seedState() });
  const violations = [];
  const lines = [];

  /* نحاول محاكاة env() الحقيقية، ولو المتصفح ما يدعمهاش نبدّل متغيرات CSS */
  let mode = 'متغيرات CSS (--safe-top / --safe-bottom)';
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: TOP, bottom: BOTTOM, left: 0, right: 0 } });
    const got = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;padding-top:env(safe-area-inset-top,0px)';
      document.body.appendChild(d);
      const v = getComputedStyle(d).paddingTop;
      d.remove();
      return v;
    });
    if (got === TOP + 'px') mode = 'env(safe-area-inset-*) عبر محاكاة المتصفح';
  } catch (e) { /* غير مدعوم */ }
  if (mode.startsWith('متغيرات')) {
    await page.evaluate(([t, b]) => {
      document.documentElement.style.setProperty('--safe-top', t + 'px');
      document.documentElement.style.setProperty('--safe-bottom', b + 'px');
    }, [TOP, BOTTOM]);
  }

  const vh = page.viewportSize().height;

  for (const tab of ['home', 'lectures', 'psets', 'settings']) {
    await gotoTab(page, tab);
    const m = await page.evaluate(async (name) => {
      const rect = (el) => el.getBoundingClientRect();
      const screen = document.getElementById('screen-' + name);
      const appbar = rect(document.getElementById('appbar'));
      const title = rect(document.getElementById('screen-title'));
      const first = rect(screen.firstElementChild);
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const tabbar = rect(document.getElementById('tabbar'));
      const last = rect(screen.lastElementChild);
      const tabsBottom = Math.max(...[...document.querySelectorAll('.tab')].map((t) => rect(t).bottom));
      const underNotch = document.elementFromPoint(195, 30);
      return {
        titleTop: title.top, appbarBottom: appbar.bottom, firstTop: first.top,
        lastBottom: last.bottom, tabbarTop: tabbar.top, tabsBottom,
        notchCovered: !!(underNotch && underNotch.closest('#appbar')),
        scrollable: document.documentElement.scrollHeight > window.innerHeight
      };
    }, tab);
    lines.push(`  ${tab}: أعلى العنوان=${m.titleTop} (≥${TOP}) | أول عنصر=${m.firstTop} (≥ أسفل الشريط العلوي ${m.appbarBottom}) | أسفل آخر عنصر=${m.lastBottom} (≤ أعلى شريط التنقل ${m.tabbarTop}) | أسفل التبويبات=${m.tabsBottom} (≤${vh - BOTTOM})`);
    if (m.titleTop < TOP) violations.push(`${tab}: عنوان الشاشة تحت النتوء (top=${m.titleTop} < ${TOP})`);
    if (m.firstTop < m.appbarBottom - 0.5) violations.push(`${tab}: أول عنصر مغطى بالشريط العلوي (${m.firstTop} < ${m.appbarBottom})`);
    if (m.lastBottom > m.tabbarTop + 0.5) violations.push(`${tab}: آخر عنصر مغطى بشريط التنقل (${m.lastBottom} > ${m.tabbarTop})`);
    if (m.tabsBottom > vh - BOTTOM + 0.5) violations.push(`${tab}: التبويبات داخلة في منطقة خط الرجوع (${m.tabsBottom} > ${vh - BOTTOM})`);
    if (!m.notchCovered) violations.push(`${tab}: منطقة النتوء مش مغطاة بالشريط العلوي بعد النزول`);
  }

  const sheets = [
    ['ورقة محاضرة', 'lectures', '.lec-main[data-id="12"]'],
    ['ورقة واجب', 'psets', '.pset-head[data-id="ps1"]'],
    ['ورقة تأكيد المسح', 'settings', '[data-action="ask-clear"]']
  ];
  for (const [name, tab, sel] of sheets) {
    await gotoTab(page, tab);
    await page.evaluate(() => window.scrollTo(0, 0));
    await openSheet(page, sel);
    const m = await page.evaluate(() => {
      const body = document.getElementById('sheet-body');
      body.scrollTop = body.scrollHeight;
      const r = (el) => el.getBoundingClientRect();
      return { top: r(document.getElementById('sheet')).top, lastBottom: r(body.lastElementChild).bottom, closeTop: r(document.querySelector('.sheet-close')).top };
    });
    lines.push(`  ${name}: أعلى الورقة=${m.top} (≥${TOP}) | أسفل آخر عنصر=${m.lastBottom} (≤${vh - BOTTOM})`);
    if (m.top < TOP) violations.push(`${name}: الورقة طالعة تحت النتوء (top=${m.top})`);
    if (m.lastBottom > vh - BOTTOM + 0.5) violations.push(`${name}: آخر عنصر داخل في منطقة خط الرجوع (${m.lastBottom} > ${vh - BOTTOM})`);
    await closeSheet(page);
  }

  await gotoTab(page, 'lectures');
  await page.tap('.check[data-id="12"]');
  await page.waitForSelector('#toast.show');
  await page.waitForTimeout(250);
  const t = await page.evaluate(() => ({ bottom: document.getElementById('toast').getBoundingClientRect().bottom, tabbarTop: document.getElementById('tabbar').getBoundingClientRect().top }));
  lines.push(`  الرسالة: أسفلها=${t.bottom} (≤ أعلى شريط التنقل ${t.tabbarTop})`);
  if (t.bottom > t.tabbarTop + 0.5) violations.push(`الرسالة مغطاة بشريط التنقل (${t.bottom} > ${t.tabbarTop})`);

  await browser.close();
  return report('5) الحواف الآمنة', violations, `طريقة المحاكاة: ${mode} | علوي ${TOP}، سفلي ${BOTTOM}\n${lines.join('\n')}`);
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
