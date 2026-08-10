// 链哨 · 后台客户管理数据读取（只读聚合 customers.json）
import fs from 'fs';
import path from 'path';

export interface CustomerRow {
  email: string;
  createdAt: number;
  lastLoginAt?: number;
}

const FILE = path.join(process.cwd(), 'data', 'customers.json');

export function readCustomers(): CustomerRow[] {
  try {
    if (fs.existsSync(FILE)) {
      const arr = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error('[customer-admin] 读取失败', e);
  }
  return [];
}
