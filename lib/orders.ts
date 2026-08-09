// 订单（订阅）记录存取：data/orders.json，后台可核对收入
import { readStore, writeStore, newId } from './config-store';
import type { OrderRecord } from './stripe';

export type { OrderRecord } from './stripe';

export function readOrders(): OrderRecord[] {
  return readStore<OrderRecord>('orders.json', []).items;
}

export function createOrder(o: { planId: string; customerEmail: string; amountUsd: number }): OrderRecord {
  const id = 'CS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const order: OrderRecord = {
    id,
    planId: o.planId,
    customerEmail: o.customerEmail,
    amountUsd: o.amountUsd,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeStore('orders.json', [...readOrders(), order]);
  return order;
}

export function updateOrder(id: string, patch: Partial<OrderRecord>): OrderRecord | null {
  const orders = readOrders();
  const next = orders.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o));
  if (!next.some((o) => o.id === id)) return null;
  writeStore('orders.json', next);
  return next.find((o) => o.id === id) || null;
}

export function findOrder(id: string): OrderRecord | null {
  return readOrders().find((o) => o.id === id) || null;
}

export { newId };
