const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; 2410DPN6CC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(300);

  console.log('环境徽章:', await page.textContent('#env'));

  // --- 1. 示例 → 解析 ---
  await page.click('#btnDemo');
  await page.click('#btnParse');
  await page.waitForTimeout(200);
  const names = await page.$$eval('#stops .nm', els => els.map(e => e.value));
  const days = await page.$$eval('#stops .daylabel', els => els.map(e => e.textContent));
  console.log('解析出天:', JSON.stringify(days));
  console.log('解析出地点:', JSON.stringify(names));
  console.log('计数:', await page.textContent('#stopCount'));

  // --- 2. 无坐标 → 生成（应降级为分段） ---
  await page.click('#btnBuild');
  await page.waitForTimeout(200);
  const planTitles = await page.$$eval('.plan .t', e => e.map(x => x.textContent));
  const legCount = await page.$$eval('.leg', e => e.length);
  const firstHref = await page.getAttribute('.leg .lk a', 'href');
  console.log('\n[无坐标] plans:', JSON.stringify(planTitles), 'legs:', legCount);
  console.log('[无坐标] 首链接:', firstHref.slice(0, 130));
  console.log('[无坐标] 有降级提示:', await page.$$eval('.hint', e => e.length) > 0);

  // --- 3. 上移/删除 ---
  await page.click('#stops .stop:nth-of-type(2) button[data-act="up"]');
  await page.waitForTimeout(120);
  console.log('\n上移后 Day1:', JSON.stringify(await page.$$eval('#stops .day:first-child .nm', e => e.map(x => x.value))));

  // --- 4. 改名清空坐标 + 手动添加 ---
  await page.click('#btnAdd');
  await page.waitForTimeout(120);
  console.log('手动添加后总数:', await page.textContent('#stopCount'));

  // --- 5. 注入坐标 → 真·多途经点 ---
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('lushu_v1'));
    const C = [[113.9784,22.4936],[113.9166,22.4818],[113.9203,22.4874],[113.9738,22.5389],[113.9835,22.5411]];
    let i = 0;
    raw.days.forEach(d => { d.stops = d.stops.filter(s => s.name); d.stops.forEach(s => { if (C[i]) { s.lon = C[i][0]; s.lat = C[i][1]; s.matched = s.name; } i++; }); });
    raw.city = '深圳';
    localStorage.setItem('lushu_v1', JSON.stringify(raw));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.click('#btnBuild');
  await page.waitForTimeout(250);
  const planTitles2 = await page.$$eval('.plan .t', e => e.map(x => x.textContent));
  console.log('\n[有坐标] plans:', JSON.stringify(planTitles2));
  const links = await page.$$eval('.leg .lk', ls => ls.map(l => ({
    label: l.querySelector('a').textContent, href: l.querySelector('a').getAttribute('href') })));
  links.forEach(l => console.log('  ' + l.label.padEnd(12) + l.href.slice(0, 115)));
  console.log('  绿边(已定位)数量:', await page.$$eval('#stops .stop.ok', e => e.length));

  await page.screenshot({ path: 'test/shot-top.png' });
  await page.evaluate(() => document.querySelector('#out').scrollIntoView());
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test/shot-out.png' });

  // --- 6. iOS UA：应出现 Apple 地图，且无坐标时也给完整多点路线 ---
  const ios = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
  });
  const ip = await ios.newPage();
  ip.on('pageerror', e => errs.push('IOS PAGEERROR: ' + e.message));
  await ip.goto('file://' + path.resolve('index.html'));
  await ip.click('#btnDemo'); await ip.click('#btnParse'); await ip.waitForTimeout(200);
  await ip.fill('#city', '深圳');
  await ip.click('#btnBuild'); await ip.waitForTimeout(250);
  console.log('\n[iOS 无坐标] 环境:', await ip.textContent('#env'));
  console.log('[iOS 无坐标] plans:', JSON.stringify(await ip.$$eval('.plan .t', e => e.map(x => x.textContent))));
  const appleLinks = await ip.$$eval('.leg .lk a', as => as.map(a => a.getAttribute('href')).filter(h => h.includes('maps.apple.com')));
  appleLinks.forEach(h => console.log('  ' + decodeURIComponent(h)));
  console.log('  waypoint 个数:', (appleLinks[0].match(/&waypoint=/g) || []).length);
  await ip.screenshot({ path: 'test/shot-ios.png', fullPage: false });
  await ios.close();

  console.log('\n=== JS 错误 ===');
  console.log(errs.length ? errs.join('\n') : '无');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
