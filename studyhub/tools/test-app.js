// StudyHub 端到端自动化测试：画笔/翻页/擦除/补充按页
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/learninglist-app/studyhub/resources/index.html';
let pass = 0, fail = 0;
const ok = (cond, name) => { console.log((cond ? '  ✓ ' : '  ✗ ') + name); cond ? pass++ : fail++; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('  [页面JS错误]', e.message));
  await page.goto(FILE);
  await page.evaluate(() => renderLesson('c-gaoshu', 'gds-p11'));

  const box = await (await page.$('#drawCanvas')).boundingBox();
  const draw = async (x0, y0, x1, y1) => {
    await page.mouse.move(box.x + x0, box.y + y0);
    await page.mouse.down();
    await page.mouse.move(box.x + x1, box.y + y1, { steps: 8 });
    await page.mouse.up();
  };
  const state = () => page.evaluate(() => ({
    page: pageIdx,
    counts: Object.entries(draws).map(([k, v]) => k + ':' + v.length),
    extras: Object.keys(extras)
  }));

  // 1) 画笔：第 1 页画一条
  await page.evaluate(() => { if (!penMode) togglePen(); });
  await draw(100, 150, 300, 150);
  let st = await state();
  ok(st.counts.some(k => k.startsWith('c-gaoshu/gds-p11#p0:') && k.endsWith(':1')), '第1页笔迹存入 #p0');

  // 2) 翻页：第 2 页应无笔迹
  await page.evaluate(() => pageMove(1));
  st = await state();
  ok(!st.counts.some(k => k.includes('#p1') && k.endsWith(':1')), '翻页后第2页无笔迹数据');

  // 3) 第 2 页画一条
  await draw(100, 150, 400, 150);
  st = await state();
  ok(st.counts.some(k => k.includes('#p1') && k.endsWith(':1')), '第2页笔迹存入 #p1');

  // 4) 回第 1 页：第 1 页笔迹仍在，第 2 页笔迹仍在
  await page.evaluate(() => pageMove(-1));
  st = await state();
  ok(st.counts.some(k => k.includes('#p0') && k.endsWith(':1')) && st.counts.some(k => k.includes('#p1') && k.endsWith(':1')), '两页笔迹互不干扰');

  // 5) 橡皮擦：擦除第 1 页笔迹
  await page.evaluate(() => { if (!penEraser) toggleEraser(); });
  await page.mouse.move(box.x + 100, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 320, box.y + 150, { steps: 15 });
  await page.mouse.up();
  st = await state();
  const p0 = st.counts.find(k => k.includes('#p0'));
  const erased = !p0 || p0.endsWith(':0');
  ok(erased, '橡皮擦掉第1页笔迹 ' + (p0 || '(空)'));

  // 6) 补充按页：第 1 页写一条
  await page.evaluate(() => {
    document.getElementById('extraInput').value = '第一页的补充';
    addExtra(extrasKey(lessonKey('c-gaoshu', 'gds-p11')));
  });
  st = await state();
  ok(st.extras.some(k => k.includes('#p0')), '补充存入第1页 (#p0)');

  // 7) 翻到第 2 页：补充区应为空（第 1 页的不串过来）
  const page2Empty = await page.evaluate(() => {
    pageMove(1);
    return !document.querySelector('#extraList .extra-item');
  });
  ok(page2Empty, '第2页补充区独立（不显示第1页内容）');

  console.log(`\n==== 结果: ${pass} 通过 / ${fail} 失败 ====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(1); });
