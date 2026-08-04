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
} from 'lucide-react';

interface MaskedSecret {
  key: string;
  configured: boolean;
  source: 'store' | 'env' | 'none';
  masked: string;
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
            onClick={() => loadAll()}
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
    </main>
  );
}
