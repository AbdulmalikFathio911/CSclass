/* 6) العناوين الإنجليزية الطويلة (المحاضرات 12 و20 و26): لا قص ولا خروج عن البطاقة، والاتجاه صحيح */
const { open, gotoTab, openSheet, closeSheet, seedState, report, KEY } = require('./lib');

const TITLES = {
  12: 'List Comprehension, Functions as Objects, Testing, Debugging',
  20: 'Fitness Tracker Object-Oriented Programming Example',
  26: 'List Access, Hashing, Simulations, and Wrap-Up'
};

/* يقيس عنصر العنوان داخل بطاقته */
function measure([titleSel, cardSel, expected]) {
  const el = document.querySelector(titleSel);
  if (!el) return { missing: true };
  const card = el.closest(cardSel);
  const cs = getComputedStyle(el);
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = [...range.getClientRects()];
  const c = card.getBoundingClientRect();
  const lines = new Set(rects.map((r) => Math.round(r.top))).size;
  const inside = rects.every((r) => r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5);
  /* الاتجاه: أول حرف لازم يكون على يسار ثاني حرف في نفس السطر */
  const t = el.firstChild;
  const ch = (i) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect(); };
  const a = ch(0), b = ch(1);
  let clipped = false;
  for (let n = el; n && n !== card.parentElement; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none') || s.whiteSpace === 'nowrap') clipped = true;
    if (n !== card && n.scrollWidth > n.clientWidth + 1 && s.display !== 'inline') clipped = true;
  }
  return {
    text: el.textContent, fullText: el.textContent === expected, lines, inside, clipped,
    ltr: cs.direction === 'ltr' && a.left < b.left, isolate: cs.unicodeBidi === 'isolate',
    left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)), cardLeft: c.left, cardRight: c.right
  };
}

async function run() {
  const violations = [];
  const lines = [];

  for (const width of [390, 320]) {
    for (const id of [12, 20, 26]) {
      /* نخلي المحاضرة المطلوبة هي "الخطوة الجاية" */
      const { browser, page } = await open({ state: seedState(id - 1), viewport: { width, height: 844 } });
      const spots = [
        ['بطاقة الخطوة الجاية', async () => { await gotoTab(page, 'home'); }, ['#next-title .en', '#next-card', TITLES[id]]],
        ['القائمة', async () => { await gotoTab(page, 'lectures'); }, [`.lec[data-lec="${id}"] .lec-title .en`, '.lec', TITLES[id]]],
        ['الورقة السفلية', async () => { await openSheet(page, `.lec-main[data-id="${id}"]`); }, ['#sheet-title .en', '#sheet', TITLES[id]]]
      ];
      for (const [where, go, args] of spots) {
        await go();
        const m = await page.evaluate(measure, args);
        const tag = `عرض ${width} | المحاضرة ${id} | ${where}`;
        if (m.missing) { violations.push(`${tag}: العنوان غير موجود`); continue; }
        lines.push(`  ${tag}: ${m.lines} سطر | النص من ${m.left.toFixed(0)} إلى ${m.right.toFixed(0)} داخل البطاقة ${m.cardLeft.toFixed(0)}–${m.cardRight.toFixed(0)} | كامل=${m.fullText} | داخل=${m.inside} | قص=${m.clipped} | LTR=${m.ltr}`);
        if (!m.fullText) violations.push(`${tag}: النص ناقص "${m.text}"`);
        if (!m.inside) violations.push(`${tag}: النص خارج عن البطاقة`);
        if (m.clipped) violations.push(`${tag}: النص مقصوص`);
        if (!m.ltr || !m.isolate) violations.push(`${tag}: اتجاه النص الإنجليزي غلط (ltr=${m.ltr}, isolate=${m.isolate})`);
      }
      await closeSheet(page);

      /* الرسالة: نص عربي + رقم + عنوان إنجليزي في سطر واحد */
      await page.tap(`.check[data-id="${id}"]`);
      await page.waitForSelector('#toast.show');
      await page.waitForTimeout(250);
      const tm = await page.evaluate(measure, ['#toast .en', '#toast', TITLES[id]]);
      const order = await page.evaluate(() => {
        const toast = document.getElementById('toast');
        const arabic = toast.firstChild;
        const r = document.createRange();
        r.setStart(arabic, 0); r.setEnd(arabic, 1);
        const firstArabic = r.getBoundingClientRect();
        const enRects = [...toast.querySelector('.en').getClientRects()];
        return { arabicRight: firstArabic.right, arabicTop: firstArabic.top, enFirstTop: enRects[0].top, enFirstRight: enRects[0].right, text: toast.textContent };
      });
      const tag = `عرض ${width} | المحاضرة ${id} | الرسالة`;
      lines.push(`  ${tag}: "${order.text}" | ${tm.lines} سطر | داخل=${tm.inside} | LTR=${tm.ltr}`);
      if (!tm.fullText || !tm.inside || tm.clipped) violations.push(`${tag}: العنوان مقصوص أو خارج الرسالة`);
      if (!tm.ltr || !tm.isolate) violations.push(`${tag}: اتجاه النص الإنجليزي غلط`);
      /* النص العربي يبدأ من اليمين، والإنجليزي يجي بعده (على يساره أو في سطر تحته) */
      if (!(order.enFirstTop > order.arabicTop + 4 || order.enFirstRight <= order.arabicRight)) violations.push(`${tag}: ترتيب العربي والإنجليزي متلخبط`);

      /* البيانات المحفوظة ما تغيّرش شكلها */
      const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
      if (saved.v !== 1 || saved.lectures[id] !== true) violations.push(`${tag}: الحفظ غلط`);
      await browser.close();
    }
  }

  return report('6) العناوين الإنجليزية الطويلة', violations, lines.join('\n'));
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
