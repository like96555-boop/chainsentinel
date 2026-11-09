'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Power, Trash2, Plus, Save, X, TrendingUp } from 'lucide-react';
import { getJson } from './adminData';
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Td, Th, inputCls } from './ui';

interface SmItem {
  address: string;
  chain: 'tron' | 'btc' | 'eth';
  name: string;
  enabled: boolean;
  demo: boolean;
}
interface SmResp { items: SmItem[] }

const EMPTY_FORM = { address: '', chain: 'tron' as SmItem['chain'], name: '', enabled: true };

export default function SmartMoney({ refreshToken }: { refreshToken: number }) {
  const [items, setItems] = useState<SmItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await getJson<SmResp>('/api/admin/smart-money');
      setItems(j.items || []);
      setError('');
    } catch { setError('监控列表读取失败。'); }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  async function request(method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
    setBusy(true);
    setMsg('');
    try {
      const url = method === 'DELETE' && body
        ? `/api/admin/smart-money?address=${encodeURIComponent(String(body))}`
        : '/api/admin/smart-money';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setMsg(`操作失败（HTTP ${res.status}）：${j?.error || ''}`); return false; }
      setItems(j.items || []);
      setMsg('已保存');
      return true;
    } catch {
      setMsg('网络异常，操作未完成');
      return false;
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!form.address.trim() || !form.name.trim()) { setMsg('请填写地址与名称'); return; }
    if (editingAddr) {
      const ok = await request('PUT', { address: editingAddr, chain: form.chain, name: form.name, enabled: form.enabled });
      if (ok) { setEditingAddr(null); setForm(EMPTY_FORM); }
    } else {
      const ok = await request('POST', form);
      if (ok) setForm(EMPTY_FORM);
    }
  }

  function cancel() { setEditingAddr(null); setForm(EMPTY_FORM); setMsg(''); }

  async function remove(item: SmItem) {
    if (!window.confirm(`确认删除监控地址 ${item.name}（${item.address.slice(0, 10)}…）？`)) return;
    await request('DELETE', item.address);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="聪明钱监控" subtitle={`公开页 /smart-money 实时读取本列表 · 当前 ${items.length} 个地址 · 写回 data/smartmoney.json`} />
      {error && <ErrorNote text={error} />}

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-zinc-400" />
          <h2 className="text-[14px] font-semibold text-zinc-900">{editingAddr ? '编辑监控地址' : '添加监控地址'}</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_110px_1fr_auto_auto] sm:items-center">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={editingAddr ? '地址（编辑时不可改）' : 'TRON / BTC / ETH 地址'}
            disabled={!!editingAddr}
            className={`font-mono text-[12px] ${inputCls}`}
          />
          <select
            value={form.chain}
            onChange={(e) => setForm({ ...form, chain: e.target.value as SmItem['chain'] })}
            className={`text-[12px] ${inputCls}`}
          >
            <option value="tron">TRON</option><option value="btc">BTC</option><option value="eth">ETH</option>
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="中文标签，如：巨鲸·XX" className={inputCls} />
          <label className="flex items-center gap-2 text-[12px] text-zinc-600">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-blue-600" />
            启用
          </label>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>
              {editingAddr ? <Save size={13} /> : <Plus size={13} />}{editingAddr ? '保存修改' : '添加'}
            </Button>
            {editingAddr && <Button variant="secondary" onClick={cancel}><X size={13} /> 取消</Button>}
          </div>
        </div>
        {msg && <p className={`mt-2 text-[12px] ${msg === '已保存' ? 'text-emerald-700' : 'text-amber-700'}`}>{msg}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-zinc-900">监控列表</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">停用后该地址立即从公开页消失；链上数据来自公共 RPC / Blockstream / TronGrid。</p>
        </div>
        {items.length === 0 ? (
          <Empty text="暂无监控地址，使用上方表单添加" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70"><Th>名称</Th><Th>链</Th><Th>地址</Th><Th>状态</Th><Th>操作</Th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.address} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                    <Td>
                      <span className="flex items-center gap-2 font-medium">
                        {item.name}
                        {item.demo && <Badge>演示</Badge>}
                      </span>
                    </Td>
                    <Td><Badge tone="blue">{item.chain.toUpperCase()}</Badge></Td>
                    <Td className="max-w-[260px] truncate font-mono text-[11px] text-zinc-500" title={item.address}>{item.address}</Td>
                    <Td><Badge tone={item.enabled ? 'green' : 'neutral'}>{item.enabled ? '启用' : '停用'}</Badge></Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditingAddr(item.address); setForm({ address: item.address, chain: item.chain, name: item.name, enabled: item.enabled }); setMsg(''); }} title="编辑" className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:border-blue-300 hover:text-blue-600"><Pencil size={13} /></button>
                        <button onClick={() => request('PUT', { address: item.address, enabled: !item.enabled })} title={item.enabled ? '停用' : '启用'} className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:border-amber-300 hover:text-amber-600"><Power size={13} /></button>
                        <button onClick={() => remove(item)} title="删除" className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:border-red-300 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
