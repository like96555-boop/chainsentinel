/**
 * 顶部导航 + 能力地图的无头浏览器布局回归。
 * 用法：node scripts/nav-visual-check.mjs
 * 环境变量：BASE_URL（默认 http://127.0.0.1:3217）、CHROME_PATH、SHOT_DIR（设置后保存截图）
 */
import fs from 'node:fs';
import os from 'node:os';
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

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return;
    } catch {
      /* 服务尚未起来 */
    }
    await new Promise((r) => setTimeout(r, 500));
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
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));
  return page;
}

async function geometry(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    headerScrollWidth: document.querySelector('header')?.scrollWidth ?? 0,
    quickLinks: document.querySelectorAll('#check a[href="/#features"], #check a[href="/en#features"]').length,
    featureCards: document.querySelectorAll('#features a[href]').length,
    groupTitles: Array.from(document.querySelectorAll('#features h3')).map((n) => n.textContent?.trim()),
    mapTitle: document.querySelector('#features h2')?.textContent?.trim() ?? '',
  }));
}

try {
  // 桌面：无横向溢出 + 功能菜单完整可见
  const desktop = await open('/', 1280, 900);
  const g1 = await geometry(desktop);
  check('桌面首页无横向溢出', g1.scrollWidth === g1.innerWidth, `${g1.scrollWidth}/${g1.innerWidth}`);
  check('首屏能力速览含全部功能 CTA', g1.quickLinks >= 1, `${g1.quickLinks} 个入口`);
  check('能力地图渲染 11 项能力', g1.featureCards === 11, `${g1.featureCards} 项`);
  check('能力地图 4 个分组齐全', g1.groupTitles.length === 4, g1.groupTitles.join(' / '));
  check('能力地图标题正确', g1.mapTitle.includes('一屏看全'), g1.mapTitle);

  const menuBtn = await desktop.$('button[aria-controls="feature-mega-menu"]');
  await menuBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  const menu = await desktop.evaluate(() => {
    const el = document.querySelector('#feature-mega-menu');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      visible: getComputedStyle(el).display !== 'none',
      left: r.left,
      right: r.right,
      bottom: r.bottom,
      items: el.querySelectorAll('a[href]').length,
      groups: el.querySelectorAll('.grid > div').length,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      background: getComputedStyle(el).backgroundColor,
      textOverflow: Array.from(el.querySelectorAll('a')).filter((a) => a.scrollWidth > a.clientWidth + 2).length,
    };
  });
  check('桌面功能菜单展开', !!menu?.visible, menu ? `${menu.items} 个链接` : '未找到');
  check('功能菜单不超出视口', !!menu && menu.left >= 0 && menu.right <= 1280, menu ? `x=${Math.round(menu.left)}~${Math.round(menu.right)}` : '');
  check('功能菜单无内部横向溢出', !!menu && menu.scrollWidth <= menu.clientWidth + 2, menu ? `${menu.scrollWidth}/${menu.clientWidth}` : '');
  check('功能菜单背景不透明', !!menu && /^rgb\(\d+, \d+, \d+\)$/.test(menu.background), menu?.background ?? '');
  if (shotDir) await desktop.screenshot({ path: path.join(shotDir, 'desktop-menu.png') });

  // 滚动时菜单应自动收起，避免盖住页面内容
  await desktop.evaluate(() => window.scrollTo(0, 400));
  await new Promise((r) => setTimeout(r, 400));
  const closedOnScroll = await desktop.evaluate(() => !document.querySelector('#feature-mega-menu'));
  check('滚动时功能菜单自动收起', closedOnScroll);

  // 能力地图区块视觉（菜单已收起）
  await desktop.evaluate(() => document.querySelector('#features')?.scrollIntoView());
  await new Promise((r) => setTimeout(r, 800));
  if (shotDir) await desktop.screenshot({ path: path.join(shotDir, 'desktop-features.png') });
  await desktop.close();

  // 窄屏：汉堡展开后功能分组完整、文字不裁切
  const mobile = await open('/', 390, 844);
  const g2 = await geometry(mobile);
  check('窄屏首页无横向溢出', g2.scrollWidth === g2.innerWidth, `${g2.scrollWidth}/${g2.innerWidth}`);
  check('窄屏头部无横向溢出', g2.headerScrollWidth <= g2.innerWidth + 1, `${g2.headerScrollWidth}/${g2.innerWidth}`);
  if (shotDir) await mobile.screenshot({ path: path.join(shotDir, 'mobile-top.png') });

  const burger = await mobile.$('button[aria-label="打开导航菜单"]');
  await burger.click();
  await new Promise((r) => setTimeout(r, 300));
  const panel = await mobile.evaluate(() => {
    const header = document.querySelector('header');
    const links = Array.from(header.querySelectorAll('a[href]'));
    return {
      links: links.length,
      hasMapLink: links.some((a) => a.getAttribute('href') === '/#features'),
      groups: Array.from(header.querySelectorAll('p')).map((p) => p.textContent?.trim()).filter((t) => t && /风控|情报|合规|开发者/.test(t)),
      overflow: links.filter((a) => a.scrollWidth > a.clientWidth + 2).length,
      docWidth: document.documentElement.scrollWidth,
    };
  });
  check('窄屏菜单展开全部功能分组', panel.groups.length === 4, panel.groups.join(' / '));
  check('窄屏菜单功能链接完整', panel.links >= 15 && panel.hasMapLink, `${panel.links} 个链接`);
  check('窄屏菜单链接无文字裁切', panel.overflow === 0, `${panel.overflow} 处裁切`);
  check('窄屏展开后仍无横向溢出', panel.docWidth === 390, `${panel.docWidth}/390`);
  if (shotDir) await mobile.screenshot({ path: path.join(shotDir, 'mobile-menu.png') });
  await mobile.close();

  // 英文首页：能力地图 + 标题不裁切
  const en = await open('/en', 390, 844);
  const g3 = await geometry(en);
  check('英文首页窄屏无横向溢出', g3.scrollWidth === g3.innerWidth, `${g3.scrollWidth}/${g3.innerWidth}`);
  check('英文能力地图渲染 11 项能力', g3.featureCards === 11, `${g3.featureCards} 项`);
  check('英文能力地图 4 个分组齐全', g3.groupTitles.length === 4, g3.groupTitles.join(' / '));
  await en.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) process.exit(1);
