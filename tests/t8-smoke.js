/* 8) عدم الانكسار: التعليم، الورقة بالسحب، حالة واجب، الفلتر، النسخة الاحتياطية، مسح البيانات. بدون أخطاء في المتصفح */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { open, gotoTab, report, KEY } = require('./lib');

async function run() {
  const violations = [];
  const lines = [];
  const step = (name, cond, detail) => {
    lines.push(`  ${cond ? 'نجح' : 'فشل'}: ${name}${detail ? ' (' + detail + ')' : ''}`);
    if (!cond) violations.push(name + (detail ? ' (' + detail + ')' : ''));
  };

  const { browser, context, page, errors } = await open({ state: null });
  const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const sheetHidden = () => page.evaluate(() => document.getElementById('sheet').hidden);
  const cdp = await context.newCDPSession(page);

  /* سحب باللمس من رأس الورقة لتحت */
  async function dragSheet(distance) {
    const box = await page.locator('#sheet-head').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + 14;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (distance * i) / 8 }] });
      await page.waitForTimeout(16);
    }
    const mid = await page.evaluate(() => getComputedStyle(document.getElementById('sheet')).transform);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    return mid;
  }

  /* 1. التعليم على مربع */
  await gotoTab(page, 'lectures');
  await page.tap('.check[data-id="1"]');
  let s = await saved();
  step('التعليم على مربع المحاضرة 1', s && s.lectures['1'] === true && await page.getAttribute('.check[data-id="1"]', 'aria-checked') === 'true', JSON.stringify(s));
  await page.tap('.check[data-id="1"]');
  s = await saved();
  step('إلغاء التعليم', s.lectures['1'] === undefined, JSON.stringify(s));
  await page.tap('.check[data-id="1"]');

  /* 2. فتح الورقة وإغلاقها بالسحب */
  await page.tap('.lec-main[data-id="2"]');
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
  step('فتح الورقة السفلية', !(await sheetHidden()), await page.textContent('#sheet-title'));
  const small = await dragSheet(40);
  step('سحب قصير (40) يرجّع الورقة مكانها', !(await sheetHidden()) && /matrix\(1, 0, 0, 1, 0, 40\)/.test(small), 'أثناء السحب: ' + small);
  const big = await dragSheet(220);
  step('سحب طويل (220) يسكّر الورقة', await sheetHidden(), 'أثناء السحب: ' + big);

  /* طرق الإغلاق الأخرى */
  await page.tap('.lec-main[data-id="2"]');
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
  await page.tap('.sheet-close');
  await page.waitForTimeout(320);
  step('زر الإغلاق يسكّر الورقة', await sheetHidden());
  await page.tap('.lec-main[data-id="2"]');
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
  await page.touchscreen.tap(195, 40);
  await page.waitForTimeout(320);
  step('الضغط على الخلفية يسكّر الورقة', await sheetHidden());

  /* التعليم من داخل الورقة */
  await page.tap('.lec-main[data-id="2"]');
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
  await page.tap('#sheet [data-action="toggle-lecture"]');
  s = await saved();
  step('التعليم من داخل الورقة', s.lectures['2'] === true && (await page.textContent('#sheet .badge')) === 'مكتملة');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(320);

  /* 3. تغيير حالة واجب */
  await gotoTab(page, 'psets');
  await page.tap('.pset[data-ps="ps1"] .seg-btn[data-s="doing"]');
  s = await saved();
  step('تغيير حالة Problem Set 1 إلى قيد العمل', s.psets.ps1 === 'doing' && (await page.textContent('.pset[data-ps="ps1"] .badge')) === 'قيد العمل', JSON.stringify(s.psets));
  await page.tap('.pset[data-ps="ps0"] .seg-btn[data-s="done"]');
  s = await saved();
  step('تغيير حالة Problem Set 0 إلى مكتمل', s.psets.ps0 === 'done');

  /* 4. الفلتر */
  await gotoTab(page, 'lectures');
  const count = () => page.evaluate(() => document.querySelectorAll('#screen-lectures .lec').length);
  await page.tap('.chip[data-f="done"]');
  const nDone = await count();
  await page.tap('.chip[data-f="left"]');
  const nLeft = await count();
  await page.tap('.chip[data-f="all"]');
  const nAll = await count();
  step('الفلتر: المكتملة / الباقي / الكل', nDone === 2 && nLeft === 24 && nAll === 26, `${nDone} / ${nLeft} / ${nAll}`);

  /* 5. النسخة الاحتياطية: تنزيل */
  await gotoTab(page, 'settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.tap('[data-action="export"]')]);
  const file = path.join(os.tmpdir(), 'masar-test-' + Date.now() + '.json');
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  const beforeClear = await saved();
  step('تنزيل النسخة الاحتياطية', backup.app === 'masar' && JSON.stringify(backup.data) === JSON.stringify(beforeClear), download.suggestedFilename());

  /* 6. مسح البيانات */
  await page.tap('[data-action="ask-clear"]');
  await page.waitForSelector('#sheet.open');
  await page.waitForTimeout(320);
  await page.tap('#sheet [data-action="clear"]');
  await page.waitForTimeout(320);
  const raw = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const checkedAfter = await page.evaluate(() => document.querySelectorAll('.check[aria-checked="true"]').length);
  step('مسح البيانات', raw === null && checkedAfter === 0 && await sheetHidden(), `المخزَّن=${raw} | معلَّمة=${checkedAfter}`);

  /* 7. الاسترجاع من الملف */
  await page.setInputFiles('#import-file', file);
  await page.waitForFunction((k) => localStorage.getItem(k) !== null, KEY);
  s = await saved();
  step('استرجاع النسخة الاحتياطية', JSON.stringify(s) === JSON.stringify(beforeClear), JSON.stringify(s));

  /* ملف غير صالح ما يخرّبش البيانات */
  const bad = path.join(os.tmpdir(), 'masar-bad-' + Date.now() + '.json');
  fs.writeFileSync(bad, '{"hello": 1');
  await page.setInputFiles('#import-file', bad);
  await page.waitForFunction(() => /صالحة/.test(document.getElementById('toast').textContent));
  s = await saved();
  step('ملف غير صالح يُرفض والبيانات تبقى', JSON.stringify(s) === JSON.stringify(beforeClear));
  fs.unlinkSync(file);
  fs.unlinkSync(bad);

  /* 8. البيانات تقعد بعد إعادة التحميل، والشكل ثابت */
  await page.reload();
  s = await saved();
  const keys = Object.keys(s).sort().join(',');
  step('البيانات باقية بعد إعادة التحميل وشكلها ثابت', JSON.stringify(s) === JSON.stringify(beforeClear) && keys === 'lectures,psets,v', 'المفاتيح: ' + keys);

  step('لا أخطاء في المتصفح', errors.length === 0, errors.length ? errors.join(' | ') : '0 أخطاء');

  await browser.close();
  return report('8) عدم الانكسار', violations, lines.join('\n'));
}

module.exports = run;
if (require.main === module) run().then((n) => process.exit(n ? 1 : 0));
