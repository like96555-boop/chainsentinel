import fs from 'fs';
import path from 'path';

export interface BlacklistEntry {
  address: string;
  label: string;
  note: string;
  source: string;
}

const FILE = path.join(process.cwd(), 'data', 'blacklist.json');

export function readBlacklist(): BlacklistEntry[] {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, 'utf8')) as BlacklistEntry[];
    }
  } catch (e) {
    console.error('[ChainSentinel] blacklist.json 读取失败。', e);
  }
  return [];
}

export function findInBlacklist(address: string): BlacklistEntry | null {
  return readBlacklist().find((e) => e.address === address) || null;
}
