// 链哨 · 客户自建监控钱包（登录客户专属，非全局公开）
// 数据：data/customer-watches.json — { [email]: WatchItem[] }
import fs from 'fs';
import path from 'path';

export interface CustomerWatch {
  address: string;
  chain: 'tron' | 'btc' | 'eth';
  name: string;
  createdAt: number;
}

const FILE = path.join(process.cwd(), 'data', 'customer-watches.json');

type Store = Record<string, CustomerWatch[]>;

function read(): Store {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf8')) as Store;
  } catch (e) {
    console.error('[customer-watches] 读取失败', e);
  }
  return {};
}

function write(s: Store): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), 'utf8');
}

/** 地址格式校验（与黑名单/监控一致：ETH/BTC/TRON 三类） */
export const ADDR_RE = {
  eth: /^0x[a-fA-F0-9]{40}$/,
  btc: /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/,
  tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

export function guessChain(addr: string): 'eth' | 'btc' | 'tron' | null {
  if (ADDR_RE.eth.test(addr)) return 'eth';
  if (ADDR_RE.tron.test(addr)) return 'tron';
  if (ADDR_RE.btc.test(addr)) return 'btc';
  return null;
}

export function listWatches(email: string): CustomerWatch[] {
  return read()[email] || [];
}

export function addWatch(email: string, address: string, name: string): { ok: true; item: CustomerWatch } | { ok: false; error: string } {
  const addr = address.trim();
  const chain = guessChain(addr);
  if (!chain) return { ok: false, error: '地址格式不正确（支持 ETH 0x… / BTC 1…3… / TRON T…）' };
  if (name.trim().length > 50) return { ok: false, error: '备注最多 50 字' };
  const s = read();
  const list = s[email] || [];
  if (list.some((w) => w.address === addr)) return { ok: false, error: '该地址已在你的监控列表' };
  if (list.length >= 20) return { ok: false, error: '最多监控 20 个地址（商业版可联系扩容）' };
  const item: CustomerWatch = { address: addr, chain, name: name.trim() || addr.slice(0, 10) + '…', createdAt: Date.now() };
  list.push(item);
  s[email] = list;
  write(s);
  return { ok: true, item };
}

export function removeWatch(email: string, address: string): boolean {
  const s = read();
  const list = (s[email] || []).filter((w) => w.address !== address);
  s[email] = list;
  write(s);
  return true;
}
