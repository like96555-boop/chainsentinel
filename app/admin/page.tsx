'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Activity,
  Users,
  LogOut,
  Loader2,
  Save,
  RefreshCw,
  Lock,
  TrendingUp,
  Plus,
  Pencil,
  Power,
  Trash2,
  X,
} from 'lucide-react';

interface MaskedSecret {
  key: string;
  configured: boolean;
  source: 'store' | 'env' | 'none';
  masked: string;
}

interface SmItem {
  address: string;
  chain: 'tron' | 'btc' | 'eth';
  name: string;
  enabled: boolean;
  demo: boolean;
}

interface Status {
  trongrid: { ok: boolean; latencyMs: number | null; status: number | null };
  secrets: { kimiConfigured: boolean; kimiBaseUrlConfigured: boolean; trongridKeyConfigured: boolean };
  blacklistCount: number;
  leads: Array<Record<string, string>>;
  uptimeSec: number;
  node: string;
}

const KEY_LABELS: Record<string, string> = {
  KIMI_API_KEY: 'Kimi 模型密钥',
  KIMI_BASE_URL: 'Kimi 接口地址',
  TRONGRID_API_KEY: 'TronGrid API Key',
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [secrets, setSecrets] = useState<MaskedSecret[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState('');

  // 聪明钱监控
  const [smItems, setSmItems] = useState<SmItem[]>([]);
  const [smForm, setSmForm] = useState<{ address: string; chain: 'tron' | 'btc' | 'eth'; name: string; enabled: boolean }>({
    address: '',
    chain: 'tron',
    name: '',
    enabled: true,
  });
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [smBusy, setSmBusy] = useState(false);
  const [smNotice, setSmNotice] = useState('');

  const loadAll = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([fetch('/api/admin/secrets'), fetch('/api/admin/status')]);
    if (sRes.status === 401 || stRes.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const sJson = await sRes.json();
    setSecrets(sJson.secrets || []);
    setStatus(await stRes.json());
  }, []);

  const loadSmartMoney = useCallback(async () => {
    const res = await fetch('/api/admin/smart-money');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const json = await res.json();
    setSmItems(json.items || []);
  }, []);

  useEffect(() => {
    loadAll().catch(() => setAuthed(false));
  }, [loadAll]);

  async function login() {
    setBusy(true);
    setLoginErr('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setLoginErr(j?.error || '登录失败');
      } else {
        setPassword('');
        await loadAll();
        await loadSmartMoney();
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setStatus(null);
    setSecrets([]);
  }

  async function saveSecrets() {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(edits)) if (v.trim()) payload[k] = v;
    if (Object.keys(payload).length === 0) {
      setNotice('请先填写要更新的密钥值');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/admin/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setNotice(j?.error || '保存失败');
      } else {
        setSecrets(j.secrets || []);
        setEdits({});
        setNotice('已加密保存 ✅');
      }
    } finally {
      setBusy(false);
    }
  }

  async function smRequest(method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
    setSmBusy(true);
    setSmNotice('');
    try {
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const url = method === 'DELETE' && body ? `/api/admin/smart-money?address=${encodeURIComponent(String(body))}` : '/api/admin/smart-money';
      const res = await fetch(url, opts);
      const j = await res.json();
      if (!res.ok) {
        setSmNotice(`⚠️ ${j?.error || `操作失败（HTTP ${res.status}）`}`);
        return false;
      }
      setSmItems(j.items || []);
      setSmNotice('✅ 已保存');
      return true;
    } catch {
      setSmNotice('⚠️ 网络异常，操作未完成');
      return false;
    } finally {
      setSmBusy(false);
    }
  }

  async function addOrSaveSm() {
    if (!smForm.address.trim() || !smForm.name.trim()) {
      setSmNotice('⚠️ 请填写地址与名称');
      return;
    }
    if (editingAddr) {
      const ok = await smRequest('PUT', {
        address: editingAddr,
        chain: smForm.chain,
        name: smForm.name,
        enabled: smForm.enabled,
      });
      if (ok) {
        setEditingAddr(null);
        setSmForm({ address: '', chain: 'tron', name: '', enabled: true });
      }
    } else {
      const ok = await smRequest('POST', smForm);
      if (ok) setSmForm({ address: '', chain: 'tron', name: '', enabled: true });
    }
  }

  function editSm(item: SmItem) {
    setEditingAddr(item.address);
    setSmForm({ address: item.address, chain: item.chain, name: item.name, enabled: item.enabled });
  }

  function cancelEdit() {
    setEditingAddr(null);
    setSmForm({ address: '', chain: 'tron', name: '', enabled: true });
  }

  async function toggleSm(item: SmItem) {
    await smRequest('PUT', { address: item.address, enabled: !item.enabled });
  }

  async function deleteSm(item: SmItem) {
    if (!window.confirm(`确认删除监控地址 ${item.name}（${item.address.slice(0, 10)}…）？`)) return;
    await smRequest('DELETE', item.address);
  }

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="grid-bg flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-cyber-700 bg-cyber-900/70 p-8">
          <div className="flex items-center gap-2">
            <Lock className="text-neon-cyan" size={20} />
            <h1 className="text-xl font-bold">链哨管理后台</h1>
          </div>
          <p className="mt-2 text-xs text-slate-500">请输入 ADMIN_PASSWORD（配置于 .env）</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="管理密码"
            className="mt-5 w-full rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2.5 text-sm outline-none focus:border-neon-cyan/60"
          />
          {loginErr && <p className="mt-2 text-sm text-neon-red">{loginErr}</p>}
          <button
            onClick={login}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan/90 px-4 py-2.5 text-sm font-semibold text-cyber-950 hover:bg-neon-cyan disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            登录
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-neon-green" size={24} />
          <h1 className="text-2xl font-bold">链哨管理后台</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              loadAll();
              loadSmartMoney();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-cyber-700 px-3 py-2 text-xs text-slate-300 hover:border-neon-cyan/60"
          >
            <RefreshCw size={13} /> 刷新
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-cyber-700 px-3 py-2 text-xs text-slate-300 hover:border-neon-red/60 hover:text-neon-red"
          >
            <LogOut size={13} /> 退出
          </button>
        </div>
      </div>

      {/* 密钥管理 */}
      <section className="mt-8 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-neon-yellow" />
          <h2 className="text-lg font-bold">密钥管理</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          密钥以 AES-256-GCM 加密存储于 data/secrets.enc.json，界面只显示掩码，绝不回传明文。
        </p>
        <div className="mt-5 space-y-4">
          {secrets.map((s) => (
            <div key={s.key} className="grid gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-center">
              <div>
                <p className="font-mono text-sm text-slate-200">{s.key}</p>
                <p className="text-xs text-slate-500">{KEY_LABELS[s.key]}</p>
              </div>
              <input
                type="password"
                value={edits[s.key] || ''}
                onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}
                placeholder={s.configured ? `当前：${s.masked}（${s.source === 'store' ? '后台配置' : '环境变量'}）` : '未配置，输入新值'}
                className="rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2 font-mono text-sm outline-none focus:border-neon-cyan/60"
              />
              <span className={`text-xs ${s.configured ? 'text-neon-green' : 'text-slate-500'}`}>
                {s.configured ? '● 已配置' : '○ 未配置'}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={saveSecrets}
          disabled={busy}
          className="mt-5 flex items-center gap-2 rounded-lg bg-neon-cyan/90 px-5 py-2.5 text-sm font-semibold text-cyber-950 hover:bg-neon-cyan disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          加密保存
        </button>
        {notice && <p className="mt-2 text-sm text-neon-green">{notice}</p>}
      </section>

      {/* 系统状态 */}
      <section className="mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-neon-cyan" />
          <h2 className="text-lg font-bold">系统状态</h2>
        </div>
        {status && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4">
              <p className="text-xs text-slate-500">TronGrid 连通性</p>
              <p className={`mt-1 font-bold ${status.trongrid.ok ? 'text-neon-green' : 'text-neon-red'}`}>
                {status.trongrid.ok ? `正常 · ${status.trongrid.latencyMs}ms` : '不可达'}
              </p>
            </div>
            <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4">
              <p className="text-xs text-slate-500">Kimi 密钥</p>
              <p className={`mt-1 font-bold ${status.secrets.kimiConfigured ? 'text-neon-green' : 'text-neon-yellow'}`}>
                {status.secrets.kimiConfigured ? '已配置' : '未配置（AI 客服降级）'}
              </p>
            </div>
            <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4">
              <p className="text-xs text-slate-500">TronGrid Key</p>
              <p className={`mt-1 font-bold ${status.secrets.trongridKeyConfigured ? 'text-neon-green' : 'text-slate-400'}`}>
                {status.secrets.trongridKeyConfigured ? '已配置' : '未配置（走公共额度）'}
              </p>
            </div>
            <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4">
              <p className="text-xs text-slate-500">黑名单条数</p>
              <p className="mt-1 font-bold text-slate-200">{status.blacklistCount} 条</p>
            </div>
          </div>
        )}
        {status && (
          <p className="mt-3 text-xs text-slate-500">
            运行 {Math.floor(status.uptimeSec / 60)} 分钟 · Node {status.node}
          </p>
        )}
      </section>

      {/* 预约线索 */}
      <section className="mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-neon-green" />
          <h2 className="text-lg font-bold">预约线索</h2>
          <span className="text-xs text-slate-500">（{status?.leads.length || 0} 条）</span>
        </div>
        {status && status.leads.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">暂无线索。落地页底部预约表单提交后将出现在这里。</p>
        )}
        {status && status.leads.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-2 pr-4">时间</th>
                <th className="py-2 pr-4">姓名</th>
                <th className="py-2 pr-4">联系方式</th>
                <th className="py-2 pr-4">意向</th>
                <th className="py-2 pr-4">备注</th>
              </tr>
            </thead>
            <tbody>
              {[...status.leads].reverse().map((l, i) => (
                <tr key={i} className="border-t border-cyber-800 text-slate-300">
                  <td className="py-2 pr-4 text-xs text-slate-500">{(l.createdAt || '').slice(0, 19).replace('T', ' ')}</td>
                  <td className="py-2 pr-4">{l.name}</td>
                  <td className="py-2 pr-4">{l.contact}</td>
                  <td className="py-2 pr-4">{l.interest}</td>
                  <td className="max-w-[240px] truncate py-2 pr-4 text-xs text-slate-500">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 聪明钱监控 */}
      <section className="mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-neon-yellow" />
          <h2 className="text-lg font-bold">聪明钱监控</h2>
          <span className="text-xs text-slate-500">（{smItems.length} 个地址 · 写回 data/smartmoney.json）</span>
        </div>

        {/* 新增 / 编辑表单 */}
        <div className="mt-4 grid gap-3 rounded-xl border border-cyber-700 bg-cyber-950/60 p-4 sm:grid-cols-[1fr_110px_1fr_auto_auto] sm:items-center">
          <input
            value={smForm.address}
            onChange={(e) => setSmForm({ ...smForm, address: e.target.value })}
            placeholder={editingAddr ? '地址（编辑时不可改）' : 'TRON / BTC / ETH 地址'}
            disabled={!!editingAddr}
            className="rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2 font-mono text-xs outline-none focus:border-neon-cyan/60 disabled:opacity-50"
          />
          <select
            value={smForm.chain}
            onChange={(e) => setSmForm({ ...smForm, chain: e.target.value as SmItem['chain'] })}
            className="rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2 text-xs outline-none focus:border-neon-cyan/60"
          >
            <option value="tron">TRON</option>
            <option value="btc">BTC</option>
            <option value="eth">ETH</option>
          </select>
          <input
            value={smForm.name}
            onChange={(e) => setSmForm({ ...smForm, name: e.target.value })}
            placeholder="中文标签，如：巨鲸·XX"
            className="rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2 text-xs outline-none focus:border-neon-cyan/60"
          />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={smForm.enabled}
              onChange={(e) => setSmForm({ ...smForm, enabled: e.target.checked })}
              className="accent-neon-cyan"
            />
            启用
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={addOrSaveSm}
              disabled={smBusy}
              className="flex items-center gap-1.5 rounded-lg bg-neon-cyan/90 px-3.5 py-2 text-xs font-semibold text-cyber-950 transition hover:bg-neon-cyan disabled:opacity-50 active:scale-95"
            >
              {smBusy ? <Loader2 size={13} className="animate-spin" /> : editingAddr ? <Save size={13} /> : <Plus size={13} />}
              {editingAddr ? '保存修改' : '添加监控'}
            </button>
            {editingAddr && (
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 rounded-lg border border-cyber-700 px-2.5 py-2 text-xs text-slate-300 transition hover:border-neon-red/60 hover:text-neon-red active:scale-95"
              >
                <X size={13} /> 取消
              </button>
            )}
          </div>
        </div>
        {smNotice && <p className={`mt-2 text-xs ${smNotice.startsWith('✅') ? 'text-neon-green' : 'text-neon-yellow'}`}>{smNotice}</p>}

        {/* 监控列表表格 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-2 pr-4">名称</th>
                <th className="py-2 pr-4">链</th>
                <th className="py-2 pr-4">地址</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2 pr-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {smItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                    暂无监控地址，使用上方表单添加。
                  </td>
                </tr>
              )}
              {smItems.map((item) => (
                <tr key={item.address} className="border-t border-cyber-800 text-slate-300">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1.5">
                      {item.name}
                      {item.demo && (
                        <span className="rounded-full border border-slate-600/60 px-1.5 py-px text-[9px] text-slate-500">演示</span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="rounded-full border border-cyber-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                      {item.chain}
                    </span>
                  </td>
                  <td className="max-w-[240px] truncate py-2.5 pr-4 font-mono text-xs text-slate-400" title={item.address}>
                    {item.address}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${item.enabled ? 'text-neon-green' : 'text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${item.enabled ? 'bg-neon-green' : 'bg-slate-600'}`} />
                      {item.enabled ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => editSm(item)}
                        title="编辑"
                        className="rounded-md border border-cyber-700 p-1.5 text-slate-400 transition hover:border-neon-cyan/60 hover:text-neon-cyan active:scale-90"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => toggleSm(item)}
                        title={item.enabled ? '停用' : '启用'}
                        className={`rounded-md border p-1.5 transition active:scale-90 ${
                          item.enabled
                            ? 'border-cyber-700 text-slate-400 hover:border-neon-yellow/60 hover:text-neon-yellow'
                            : 'border-neon-green/40 text-neon-green hover:border-neon-green'
                        }`}
                      >
                        <Power size={12} />
                      </button>
                      <button
                        onClick={() => deleteSm(item)}
                        title="删除"
                        className="rounded-md border border-cyber-700 p-1.5 text-slate-400 transition hover:border-neon-red/60 hover:text-neon-red active:scale-90"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          公开页 /smart-money 实时读取本列表；停用后该地址立即从公开页消失。链上数据来自公共 RPC / Blockstream / TronGrid。
        </p>
      </section>
    </main>
  );
}
