/* 2) التباين: نص عادي 4.5:1، نص كبير وأيقونات وحدود 3:1. يفحص كل زوج لون مستعمل فعلاً */
const { open, eachView, seedState, report } = require('./lib');

function inPage() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  /* الخلفية الفعلية خلف العنصر: دمج خلفيات كل الآباء من الجذر */
  const bgOf = (el) => {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const n of chain) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) bg = over(c, bg);
    }
    return bg;
  };
  const visible = (el) => {
    if (el.closest('[hidden]') || el.closest('.vh') || el.closest('.sprite')) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1;
  };
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : (el.className && el.className.baseVal ? '.' + el.className.baseVal.split(/\s+/).join('.') : ''));

  const out = [];

  /* النصوص */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const done = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.nodeValue.trim() || !el || done.has(el) || !visible(el)) continue;
    if (el.closest('script, style, noscript')) continue;
    done.add(el);
    const cs = getComputedStyle(el);
    const fgRaw = parse(cs.color);
    if (!fgRaw || fgRaw.a === 0) continue;
    const bg = bgOf(el);
    const fg = over(fgRaw, bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    out.push({ kind: large ? 'نص كبير' : 'نص', need: large ? 3 : 4.5, ratio: ratio(fg, bg), fg: hex(fg), bg: hex(bg), who: label(el) + ' ' + size + 'px/' + weight, sample: node.nodeValue.trim().slice(0, 24) });
  }

  /* الأيقونات */
  document.querySelectorAll('svg.ic').forEach((el) => {
    if (!visible(el)) return;
    const c = parse(getComputedStyle(el).color);
    if (!c || c.a === 0) return;
    const bg = bgOf(el);
    out.push({ kind: 'أيقونة', need: 3, ratio: ratio(over(c, bg), bg), fg: hex(over(c, bg)), bg: hex(bg), who: label(el.parentElement) + ' > ' + el.querySelector('use').getAttribute('href'), sample: '' });
  });

  /* الحدود: لون الحد مقابل الخلفية اللي برا العنصر */
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el) || el.closest('svg')) return;
    const cs = getComputedStyle(el);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') {
        const c = parse(cs['border' + side + 'Color']);
        if (!c || c.a === 0) return;
        const outside = bgOf(el.parentElement);
        out.push({ kind: 'حد', need: 3, ratio: ratio(over(c, outside), outside), fg: hex(over(c, outside)), bg: hex(outside), who: label(el), sample: '' });
        return;
      }
    }
  });

  /* عناصر رسومية بدون حد: مقبض الورقة، شريط التقدم، مربع التعليم المعلَّم */
  [['.grabber', 'مقبض الورقة'], ['.bar > span', 'شريط التقدم'], ['.check[aria-checked="true"] .box', 'مربع معلَّم']].forEach(([sel, name]) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!visible(el)) return;
      const c = parse(getComputedStyle(el).backgroundColor);
      if (!c || c.a === 0) return;
      const outside = bgOf(el.parentElement);
      out.push({ kind: 'رسم', need: 3, ratio: ratio(over(c, outside), outside), fg: hex(over(c, outside)), bg: hex(outside), who: name, sample: '' });
    });
  });

  return out;
}

async function run() {
  const { browser, page } = await open({ state: seedState() });
  const pairs = new Map();

  await eachView(page, async (view) => {
    for (const it of await page.evaluate(inPage)) {
      const key = [it.kind, it.fg, it.bg].join('|');
      if (!pairs.has(key)) pairs.set(key, { ...it, view, count: 0 });
      pairs.get(key).count++;
    }
  }, { toast: true });

  await browser.close();

  const rows = [...pairs.values()].sort((a, b) => a.ratio - b.ratio);
  const violations = rows.filter((r) => r.ratio < r.need)
    .map((r) => `${r.kind} ${r.fg} على ${r.bg} = ${r.ratio.toFixed(2)}:1 (المطلوب ${r.need}) ← ${r.who} "${r.sample}" [${r.view}]`);
  const table = rows.map((r) => `  ${r.ratio.toFixed(2).padStart(5)}:1  (≥${r.need})  ${r.kind.padEnd(8)} ${r.fg} على ${r.bg}  ${r.who}`).join('\n');
  return report('2) التباين', violations, `أزواج الألوان المستعملة فعلاً: ${rows.length}\n${table}`);
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
