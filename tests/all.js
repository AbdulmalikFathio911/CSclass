/* يشغّل الاختبارات الثمانية بالترتيب ويطبع الملخص */
const tests = [
  ['1 اللمس', './t1-touch'],
  ['2 التباين', './t2-contrast'],
  ['3 التباعد', './t3-spacing'],
  ['4 الخط', './t4-type'],
  ['5 الحواف الآمنة', './t5-safe-area'],
  ['6 العناوين الطويلة', './t6-long-titles'],
  ['7 التطبيق المثبّت', './t7-pwa'],
  ['8 عدم الانكسار', './t8-smoke']
];

(async () => {
  const summary = [];
  for (const [name, file] of tests) {
    let n;
    try { n = await require(file)(); } catch (e) { console.log('\n=== ' + name + ' ===\nتعطّل الاختبار: ' + e.message); n = -1; }
    summary.push([name, n]);
  }
  console.log('\n=== الملخص ===');
  summary.forEach(([name, n]) => console.log(`  ${name}: ${n === 0 ? 'ناجح (0 مخالفات)' : n < 0 ? 'تعطّل' : n + ' مخالفة'}`));
  process.exit(summary.every(([, n]) => n === 0) ? 0 : 1);
})();
