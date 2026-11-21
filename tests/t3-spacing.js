/* 3) التباعد: كل padding/margin/gap من مضاعفات 4، والمسافة بين أي عنصرين يتضغطوا متجاورين 8 على الأقل */
const { open, eachView, seedState, report } = require('./lib');

function inPage() {
  const visible = (el) => {
    if (el.closest('[hidden]') || el.closest('.vh') || el.closest('svg')) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.id ? '#' + el.id : '');
  const off = [];
  const values = new Set();
  let checked = 0;

  const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap'];
  document.querySelectorAll('body, body *').forEach((el) => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    for (const p of props) {
      const raw = cs[p];
      if (!raw || raw === 'normal' || raw === 'auto') continue;
      const v = parseFloat(raw);
      if (Number.isNaN(v) || v === 0) continue;
      checked++;
      values.add(v);
      if (Math.abs(v / 4 - Math.round(v / 4)) > 0.001) off.push(`${label(el)} ${p} = ${raw}`);
    }
  });

  /* العناصر الثابتة: المسافة الفعلية عن حواف الشاشة وعن شريط التنقل */
  const vw = document.documentElement.clientWidth;
  const tabbar = document.getElementById('tabbar').getBoundingClientRect();
  const toast = document.getElementById('toast');
  if (toast.classList.contains('show')) {
    const r = toast.getBoundingClientRect();
    [['toast: المسافة عن اليسار', r.left], ['toast: المسافة عن اليمين', vw - r.right], ['toast: المسافة فوق شريط التنقل', tabbar.top - r.bottom]].forEach(([name, v]) => {
      checked++;
      values.add(v);
      if (Math.abs(v / 4 - Math.round(v / 4)) > 0.001) off.push(`${name} = ${v}px`);
    });
  }

  /* المسافة بين العناصر التفاعلية المتجاورة، كل طبقة بروحها */
  const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="tab"], [role="checkbox"], [role="radio"]';
  const sheetOpen = !document.getElementById('sheet').hidden;
  const layers = sheetOpen ? ['#sheet'] : ['#main', '#tabbar'];
  const tight = [];
  let minGap = Infinity;
  let pairs = 0;
  for (const layer of layers) {
    const els = [...document.querySelectorAll(layer + ' ' + sel.split(', ').join(', ' + layer + ' '))].filter(visible);
    const rects = els.map((el) => ({ el, r: el.getBoundingClientRect() }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        let gap = null;
        if (overlapY > 0 && overlapX > 0) gap = -Math.min(overlapX, overlapY);
        else if (overlapY > 0) gap = Math.max(a.left - b.right, b.left - a.right);
        else if (overlapX > 0) gap = Math.max(a.top - b.bottom, b.top - a.bottom);
        if (gap === null) continue;
        pairs++;
        minGap = Math.min(minGap, gap);
        if (gap < 7.99) tight.push(`${label(rects[i].el)} ↔ ${label(rects[j].el)} = ${gap.toFixed(1)}px`);
      }
    }
  }
  return { off, tight, checked, pairs, minGap, values: [...values] };
}

async function run() {
  const { browser, page } = await open({ state: seedState() });
  const violations = new Set();
  const values = new Set();
  let checked = 0, pairs = 0, minGap = Infinity;

  await eachView(page, async (view) => {
    const res = await page.evaluate(inPage);
    checked += res.checked;
    pairs += res.pairs;
    minGap = Math.min(minGap, res.minGap);
    res.values.forEach((v) => values.add(v));
    res.off.forEach((v) => violations.add('ليست من مضاعفات 4: ' + v));
    res.tight.forEach((v) => violations.add(`[${view}] أقل من 8 بين عنصرين تفاعليين: ` + v));
  }, { toast: true });

  await browser.close();
  const used = [...values].sort((a, b) => a - b).join(', ');
  return report('3) التباعد', [...violations],
    `قيم padding/margin/gap مقاسة: ${checked} | القيم المستعملة: ${used}\nأزواج عناصر تفاعلية متجاورة: ${pairs} | أصغر مسافة: ${minGap}px`);
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
