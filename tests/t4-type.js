/* 4) الخط: نص القراءة 16 على الأقل، أصغر نص مساعد 12، حقول الإدخال 16 */
const { open, eachView, seedState, report } = require('./lib');

/* الأدوار المساعدة المسموح لها تكون أصغر من 16 (ولا تنزل عن 12) */
const HELPER = ['.meta', '.label', '.badge', '.week', '.tab-label', '.tile-label', '.hero-kicker', '.lec-num'];

function inPage(helper) {
  const visible = (el) => {
    if (el.closest('[hidden]') || el.closest('.vh') || el.closest('.sprite')) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1;
  };
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const done = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.nodeValue.trim() || !el || done.has(el) || !visible(el) || el.closest('script, style, noscript')) continue;
    done.add(el);
    const size = parseFloat(getComputedStyle(el).fontSize);
    const role = helper.find((h) => el.closest(h)) || null;
    texts.push({ size, role, who: label(el), sample: node.nodeValue.trim().slice(0, 24) });
  }
  const fields = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].map((el) => ({
    who: label(el) + '#' + el.id + '[type=' + el.type + ']', size: parseFloat(getComputedStyle(el).fontSize), hidden: el.hidden
  }));
  return { texts, fields };
}

async function run() {
  const { browser, page } = await open({ state: seedState() });
  const violations = new Set();
  const bySize = new Map();
  let min = Infinity, minReading = Infinity, count = 0;
  let fields = [];

  await eachView(page, async (view) => {
    const res = await page.evaluate(inPage, HELPER);
    fields = res.fields;
    for (const t of res.texts) {
      count++;
      min = Math.min(min, t.size);
      const k = t.size + 'px ' + (t.role || 'نص قراءة');
      bySize.set(k, (bySize.get(k) || 0) + 1);
      if (t.size < 12) violations.add(`أصغر من 12: ${t.who} = ${t.size}px "${t.sample}" [${view}]`);
      if (!t.role) {
        minReading = Math.min(minReading, t.size);
        if (t.size < 16) violations.add(`نص قراءة أصغر من 16: ${t.who} = ${t.size}px "${t.sample}" [${view}]`);
      }
    }
  }, { toast: true });

  fields.forEach((f) => { if (f.size < 16) violations.add(`حقل إدخال أصغر من 16: ${f.who} = ${f.size}px`); });
  await browser.close();

  const dist = [...bySize.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([k, n]) => `  ${k}: ${n}`).join('\n');
  const fieldsTxt = fields.length ? fields.map((f) => `${f.who} = ${f.size}px${f.hidden ? ' (مخفي، يُفتح بزر)' : ''}`).join(' | ') : 'لا يوجد';
  return report('4) الخط', [...violations],
    `عناصر نصية مقاسة: ${count} | أصغر نص: ${min}px | أصغر نص قراءة: ${minReading}px\nالتوزيع:\n${dist}\nحقول الإدخال: ${fieldsTxt}`);
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
