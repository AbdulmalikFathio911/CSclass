/* 1) مساحات اللمس: كل عنصر يتضغط لا يقل عن 44×44 */
const { open, eachView, seedState, report } = require('./lib');

async function run() {
  const { browser, page } = await open({ state: seedState() });
  const violations = [];
  const seen = new Set();
  let measured = 0;
  let minW = Infinity;
  let minH = Infinity;

  await eachView(page, async (view) => {
    const items = await page.evaluate(() => {
      const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, label[for], [role="tab"], [role="checkbox"], [role="radio"], [role="button"], [tabindex]:not([tabindex="-1"]), #sheet-head';
      return [...document.querySelectorAll(sel)].filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return !el.closest('[hidden]') && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).map((el) => {
        const r = el.getBoundingClientRect();
        const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        return { id: el.tagName.toLowerCase() + '.' + (el.className.baseVal === undefined ? el.className : '') + (el.id ? '#' + el.id : '') + ' "' + name + '"', w: r.width, h: r.height };
      });
    });
    for (const it of items) {
      measured++;
      minW = Math.min(minW, it.w);
      minH = Math.min(minH, it.h);
      if (it.w < 43.99 || it.h < 43.99) {
        const key = it.id + it.w + 'x' + it.h;
        if (!seen.has(key)) { seen.add(key); violations.push(`[${view}] ${it.id} = ${it.w.toFixed(1)}×${it.h.toFixed(1)}`); }
      }
    }
  });

  await browser.close();
  return report('1) مساحات اللمس (الحد 44×44)', violations,
    `عناصر مقاسة: ${measured} | أصغر عرض: ${minW.toFixed(1)} | أصغر ارتفاع: ${minH.toFixed(1)}`);
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
