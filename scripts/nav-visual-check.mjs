/**
 * 顶部导航 + 能力地图的无头浏览器交互 / 布局回归。
 *
 * 用法：node scripts/nav-visual-check.mjs
 * 环境变量：BASE_URL（默认 http://127.0.0.1:3217）、CHROME_PATH、SHOT_DIR（设置后保存截图）
 *
 * 重点回归 v2 的「点开闪退」：菜单被 scroll / mouseleave 误关、站内链接整页刷新白屏。
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3217';
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('未找到 Chrome/Edge，请设置 CHROME_PATH');

const shotDir = process.env.SHOT_DIR || '';
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* 服务尚未起来 */
    }
    await sleep(500);
  }
  throw new Error(`服务未就绪：${BASE}`);
}

await waitForServer();
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

async function open(pathname, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  await page.evaluate(() => {
    window.__navProbe = 'alive';
  });
  return page;
}

const probe = (page) => page.evaluate(() => window.__navProbe ?? null);

async function geometry(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    headerScrollWidth: document.querySelector('header')?.scrollWidth ?? 0,
    featureCards: document.querySelectorAll('#features .cap-row').length,
    groupTitles: Array.from(document.querySelectorAll('#features h3')).map((n) => n.textContent?.trim()),
    mapTitle: document.querySelector('#features h2')?.textContent?.trim() ?? '',
    sceneChips: document.querySelectorAll('#features .scene-chip').length,
    quickChips: document.querySelectorAll('.quick-chip').length,
  }));
}

try {
  /* ---------------- 桌面 ---------------- */
  const desktop = await open('/', 1280, 900);
  const g1 = await geometry(desktop);
  check('桌面首页无横向溢出', g1.scrollWidth === g1.innerWidth, `${g1.scrollWidth}/${g1.innerWidth}`);
  check('能力地图渲染 11 项能力', g1.featureCards === 11, `${g1.featureCards} 项`);
  check('能力地图 4 个分组齐全', g1.groupTitles.length === 4, g1.groupTitles.join(' / '));
  check('场景直达 4 个锚点', g1.sceneChips === 4, `${g1.sceneChips} 个`);
  check('首屏速览含全部功能入口', g1.quickChips >= 5, `${g1.quickChips} 个 chips`);
  check('能力地图标题正确', g1.mapTitle.includes('一屏看全'), g1.mapTitle);

  const noDropdown = await desktop.evaluate(() => ({
    oldMega: document.querySelectorAll('[aria-controls="feature-mega-menu"]').length,
    cta: !!document.querySelector('.nav-all-btn'),
    visibleLinks: Array.from(document.querySelectorAll('header nav a')).filter(
      (a) => a.getBoundingClientRect().width > 0
    ).length,
  }));
  check('已移除会闪退的下拉菜单', noDropdown.oldMega === 0);
  check('顶部「全部功能」常驻入口存在', noDropdown.cta);
  check('桌面常驻入口直接可见', noDropdown.visibleLinks >= 7, `${noDropdown.visibleLinks} 个链接`);

  // 点「全部功能」：平滑滚动 + 无整页刷新
  await desktop.click('.nav-all-btn');
  await sleep(1100);
  const afterCta = await desktop.evaluate(() => ({
    probe: window.__navProbe ?? null,
    hash: location.hash,
    y: Math.round(window.scrollY),
    featuresTop: Math.round(document.querySelector('#features')?.getBoundingClientRect().top ?? -1),
  }));
  check('点「全部功能」无整页刷新', afterCta.probe === 'alive', String(afterCta.probe));
  check('点「全部功能」定位到能力地图', afterCta.hash === '#features' && afterCta.featuresTop >= 0 && afterCta.featuresTop < 160, `top=${afterCta.featuresTop}`);

  // 四列并排 + 11 项同屏
  const grid = await desktop.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#features .cap-card'));
    const rows = Array.from(document.querySelectorAll('#features .cap-row'));
    return {
      columns: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size,
      allInView: rows.every((r) => {
        const b = r.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= window.innerHeight;
      }),
      overflow: Array.from(document.querySelectorAll('#features .cap-row')).filter(
        (r) => r.scrollWidth > r.clientWidth + 2
      ).length,
    };
  });
  check('桌面能力总览为 4 列并排', grid.columns === 4, `${grid.columns} 列`);
  check('桌面 11 项能力同屏可见', grid.allInView);
  check('能力卡片文字无横向裁切', grid.overflow === 0, `${grid.overflow} 处`);
  if (shotDir) await desktop.screenshot({ path: path.join(shotDir, 'desktop-features.png') });

  // 地图内同页锚点：无刷新、无闪退
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const checkLink = await desktop.$('#features .cap-row[href="#check"], #features .cap-row[href="/#check"]');
  if (checkLink) {
    await checkLink.click();
    await sleep(900);
    check('能力地图同页锚点无整页刷新', (await probe(desktop)) === 'alive', await desktop.evaluate(() => location.hash));
  } else {
    check('能力地图同页锚点存在', false, '未找到 #check 链接');
  }

  // 跨页链接走客户端路由，不白屏
  await desktop.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await desktop.evaluate(() => {
    window.__navProbe = 'alive-spa';
  });
  const across = await desktop.$('header nav a[href="/alerts"]');
  if (across) {
    await across.click();
    await sleep(1400);
    const spa = await desktop.evaluate(() => ({ probe: window.__navProbe ?? null, path: location.pathname }));
    check('跨页导航为客户端路由（无白屏）', spa.probe === 'alive-spa' && spa.path === '/alerts', `${spa.path} / ${spa.probe}`);
  } else {
    check('跨页导航链接存在', false);
  }
  await desktop.close();

  /* ---------------- 窄屏 ---------------- */
  const mobile = await open('/', 390, 844);
  const g2 = await geometry(mobile);
  check('窄屏首页无横向溢出', g2.scrollWidth === g2.innerWidth, `${g2.scrollWidth}/${g2.innerWidth}`);
  check('窄屏头部无横向溢出', g2.headerScrollWidth <= g2.innerWidth + 1, `${g2.headerScrollWidth}/${g2.innerWidth}`);
  check('窄屏能力地图 11 项齐全', g2.featureCards === 11, `${g2.featureCards} 项`);
  if (shotDir) await mobile.screenshot({ path: path.join(shotDir, 'mobile-top.png') });

  const burger = await mobile.$('button[aria-controls="mobile-nav-panel"]');
  await burger.click();
  await sleep(450);

  const panelState = () =>
    mobile.evaluate(() => {
      const el = document.querySelector('#mobile-nav-panel');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const links = Array.from(el.querySelectorAll('a[href]'));
      return {
        visible: cs.visibility === 'visible' && Number(cs.opacity) > 0.9,
        groups: el.querySelectorAll('[id^="nav-group-"]').length,
        featureLinks: el.querySelectorAll('[id^="nav-group-"] a').length,
        links: links.length,
        overflow: links.filter((a) => a.scrollWidth > a.clientWidth + 2).length,
        docWidth: document.documentElement.scrollWidth,
      };
    });

  const p1 = await panelState();
  check('窄屏面板展开', !!p1?.visible);
  check('面板内 4 个场景分组完整', p1?.groups === 4, `${p1?.groups} 组`);
  check('面板内 11 项能力全部可见', p1?.featureLinks === 11, `${p1?.featureLinks} 项`);
  check('面板内文字无裁切', p1?.overflow === 0, `${p1?.overflow} 处`);
  check('展开后无横向溢出', p1?.docWidth === 390, `${p1?.docWidth}/390`);
  if (shotDir) await mobile.screenshot({ path: path.join(shotDir, 'mobile-menu.png') });

  // 关键回归：轻微滚动、鼠标移动都不能把面板关掉
  await mobile.evaluate(() => window.scrollBy(0, 60));
  await sleep(350);
  check('轻微滚动后面板仍保持打开', (await panelState())?.visible === true);
  await mobile.mouse.move(200, 300, { steps: 10 });
  await sleep(250);
  check('鼠标移动后面板仍保持打开', (await panelState())?.visible === true);
  await mobile.evaluate(() => window.scrollBy(0, 200));
  await sleep(350);
  check('继续滚动后面板仍保持打开', (await panelState())?.visible === true);

  // 点菜单项：正常关闭且不白屏
  const firstFeature = await mobile.$('#mobile-nav-panel [id^="nav-group-"] a');
  await firstFeature.click();
  await sleep(900);
  check('点面板内功能不白屏', (await probe(mobile)) === 'alive');
  check('点面板内功能后面板收起', (await panelState())?.visible === false);

  // Esc 关闭
  await mobile.evaluate(() => window.scrollTo(0, 0));
  const burger2 = await mobile.$('button[aria-controls="mobile-nav-panel"]');
  await burger2.click();
  await sleep(400);
  await mobile.keyboard.press('Escape');
  await sleep(400);
  check('Esc 可关闭面板', (await panelState())?.visible === false);
  await mobile.close();

  /* ---------------- 英文窄屏 ---------------- */
  const en = await open('/en', 390, 844);
  const g3 = await geometry(en);
  check('英文首页窄屏无横向溢出', g3.scrollWidth === g3.innerWidth, `${g3.scrollWidth}/${g3.innerWidth}`);
  check('英文能力地图 11 项齐全', g3.featureCards === 11, `${g3.featureCards} 项`);
  check('英文能力地图 4 个分组齐全', g3.groupTitles.length === 4, g3.groupTitles.join(' / '));
  const enBurger = await en.$('button[aria-controls="mobile-nav-panel"]');
  await enBurger.click();
  await sleep(400);
  const enPanel = await en.evaluate(() => {
    const el = document.querySelector('#mobile-nav-panel');
    return {
      visible: getComputedStyle(el).visibility === 'visible',
      title: el.querySelector('p')?.textContent?.trim() ?? '',
      features: el.querySelectorAll('[id^="nav-group-"] a').length,
    };
  });
  check('英文面板展开且文案正确', enPanel.visible && enPanel.title.includes('All ChainSentinel'), enPanel.title);
  check('英文面板 11 项能力齐全', enPanel.features === 11, `${enPanel.features} 项`);
  await en.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exit(1);
