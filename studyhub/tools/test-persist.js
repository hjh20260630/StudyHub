// 持久化验证：draw=写入测试笔迹 / clean=清理测试笔迹
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fs = require('fs');
const mode = process.argv[2] || 'draw';
(async () => {
  let auth = null, prev = "";
  for (let i = 0; i < 25; i++) {
    try {
      const t = fs.readFileSync('D:/learninglist-app/studyhub/dist/StudyHub/.tmp/auth_info.json', 'utf8');
      if (t === prev && prev) { auth = JSON.parse(t); break; }
      prev = t;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  if (!auth) { console.log('拿不到 auth'); process.exit(1); }
  const url = `http://127.0.0.1:${auth.nlPort}/?connectToken=${auth.nlConnectToken}`;
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (let i = 0; i < 10; i++) {
    try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 }); break; }
    catch (e) { await new Promise(r => setTimeout(r, 1000)); }
  }
  await new Promise(r => setTimeout(r, 3000));
  const res = await page.evaluate((mode) => {
    if (mode === 'draw') {
      draws['__test__#p0'] = [{ c: '#ef4444', w: 2, pts: [[0.5, 123.4]] }];
      dbSet('draws', draws);
      return '测试笔迹已写入: ' + (draws['__test__#p0'] ? 'OK' : 'FAIL');
    } else {
      delete draws['__test__#p0'];
      dbSet('draws', draws);
      return '测试笔迹已清理';
    }
  }, mode);
  console.log(res);
  await new Promise(r => setTimeout(r, 1500));   // 等落盘防抖
  await browser.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
