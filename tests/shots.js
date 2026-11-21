/* يصوّر الشاشات الأربع والورقة السفلية بمقاس 390×844. الاستعمال: node tests/shots.js <مجلد الحفظ> */
const path = require('path');
const fs = require('fs');
const { open, gotoTab, openSheet, closeSheet, seedState } = require('./lib');

(async () => {
  const dir = process.argv[2] || path.join(__dirname, 'shots');
  fs.mkdirSync(dir, { recursive: true });
  const { browser, page } = await open({ state: seedState(), dpr: 2 });
  const shot = (name) => page.screenshot({ path: path.join(dir, name + '.png') });

  await gotoTab(page, 'home');
  await shot('1-home');
  await gotoTab(page, 'lectures');
  await page.evaluate(() => document.querySelector('.lec[data-lec="12"]').scrollIntoView({ block: 'center' }));
  await shot('2-lectures');
  await gotoTab(page, 'psets');
  await shot('3-psets');
  await gotoTab(page, 'settings');
  await shot('4-settings');
  await gotoTab(page, 'lectures');
  await openSheet(page, '.lec-main[data-id="12"]');
  await shot('5-sheet');
  await closeSheet(page);

  await browser.close();
  console.log('الصور في: ' + dir);
})();
