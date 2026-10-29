// 一次性诊断：连接最新实例，抓控制台错误与状态
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fs = require('fs');
(async () => {
  // 轮询读 auth_info（内容会随启动变化，取 3 秒内稳定的）
  let auth = null, prev = "";
  for (let i = 0; i < 25; i++) {
    try {
      const t = fs.readFileSync('D:/learninglist-app/studyhub/dist/StudyHub/.tmp/auth_info.json', 'utf8');
      if (t === prev && prev) { auth = JSON.parse(t); break; }
      prev = t;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  if (!auth) { console.log('拿不到稳定的 auth_info'); process.exit(1); }
  console.log('目标端口:', auth.nlPort);
  const url = `http://127.0.0.1:${auth.nlPort}/?connectToken=${auth.nlConnectToken}`;
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 250)); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('requestfailed', r => { if (r.url().includes('neutralino')) errs.push('请求失败: ' + r.url().slice(0, 120) + ' ' + (r.failure() || {}).errorText); });
  for (let i = 0; i < 10; i++) {
    try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 }); break; }
    catch (e) { await new Promise(r => setTimeout(r, 1000)); }
  }
  await new Promise(r => setTimeout(r, 5000));
  const state = await page.evaluate(() => ({
    NL_PORT: typeof window.NL_PORT !== 'undefined' ? window.NL_PORT : null,
    hasNeutralino: typeof Neutralino !== 'undefined',
    hasInit: typeof Neutralino !== 'undefined' && typeof Neutralino.init === 'function',
    hasOS: typeof Neutralino !== 'undefined' && !!Neutralino.os,
    hasFS: typeof Neutralino !== 'undefined' && !!Neutralino.filesystem,
    isDesktopNow: typeof isDesktopNow === 'function' ? isDesktopNow() : null,
    diskDataPath: typeof diskDataPath !== 'undefined' ? diskDataPath : null,
    homeRendered: !!document.querySelector('.course-card, .home-hero')
  }));
  console.log('页面状态:', JSON.stringify(state, null, 1));
  // 直接试调原生 API，抓真实错误
  const probes = await page.evaluate(async () => {
    const r = {};
    try { await Neutralino.filesystem.createDirectory({ path: 'C:\\Users\\hjh\\AppData\\Roaming\\StudyHub' }); r.createDirectory = 'OK'; } catch (e) { r.createDirectory = 'ERR: ' + (e.message || e.code || JSON.stringify(e)); }
    try { await Neutralino.filesystem.writeFile({ path: 'C:\\Users\\hjh\\AppData\\Roaming\\StudyHub\\__probe.txt', data: 'probe' }); r.writeFilePath = 'OK'; } catch (e) { r.writeFilePath = 'ERR: ' + (e.message || e.code || JSON.stringify(e)); }
    try { await Neutralino.filesystem.writeFile({ fileName: '__probe2.txt', data: 'probe' }); r.writeFileFileName = 'OK'; } catch (e) { r.writeFileFileName = 'ERR: ' + (e.message || e.code || JSON.stringify(e)); }
    try { const rd = await Neutralino.filesystem.readFile({ path: 'C:\\Users\\hjh\\AppData\\Roaming\\StudyHub\\__probe.txt' }); r.readFile = rd.data; } catch (e) { r.readFile = 'ERR: ' + (e.message || e.code || JSON.stringify(e)); }
    return r;
  });
  console.log('API 探测:', JSON.stringify(probes, null, 1));
  console.log('错误/警告:', errs.length ? errs.slice(0, 12) : '(无)');
  await browser.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
