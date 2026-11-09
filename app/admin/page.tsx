'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import AdminNav, { ALL_TABS, type AdminTab } from '@/components/admin/AdminNav';
import ConfigModules, { type ConfigTab } from '@/components/admin/ConfigModules';
import Overview from '@/components/admin/Overview';
import Todos from '@/components/admin/Todos';
import Orders from '@/components/admin/Orders';
import AgentEcosystem from '@/components/admin/AgentEcosystem';
import AiAssistant from '@/components/admin/AiAssistant';
import Secrets from '@/components/admin/Secrets';
import SmartMoney from '@/components/admin/SmartMoney';
import { buildTodos, type Status } from '@/components/admin/adminData';
import { PageHeader } from '@/components/admin/ui';

/** 新版 IA → 既有功能模块的映射；这些模块逻辑不变，由浅色适配层统一外观 */
const LEGACY: Partial<Record<AdminTab, ConfigTab>> = {
  customers: 'customers',
  blacklist: 'blacklist',
  keys: 'apikeys',
  billing: 'billing',
  audit: 'audit',
  webhooks: 'webhooks',
};

function tabFromHash(): AdminTab {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace(/^#/, '');
  return (ALL_TABS.find((t) => t.id === h)?.id || 'overview') as AdminTab;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [refreshToken, setRefreshToken] = useState(0);
  const [toast, setToast] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store' });
      if (res.status === 401) { setAuthed(false); return; }
      setStatus(await res.json());
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    setTab(tabFromHash());
    loadStatus();
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadStatus]);

  function navigate(next: AdminTab) {
    setTab(next);
    if (typeof window !== 'undefined') window.location.hash = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function refresh() {
    setRefreshToken((n) => n + 1);
    loadStatus();
    setToast('数据已刷新');
    setTimeout(() => setToast(''), 2200);
  }

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
        await loadStatus();
      }
    } finally { setBusy(false); }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setStatus(null);
  }

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-zinc-400" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="admin-light flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600"><ShieldCheck size={19} className="text-white" /></div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-zinc-900">ChainSentinel</h1>
              <p className="text-[11px] text-zinc-500">运营控制台</p>
            </div>
          </div>
          <p className="mt-6 text-[12px] text-zinc-500">请输入管理密码以继续</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="管理密码"
            className="mt-2.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {loginErr && <p className="mt-2 text-[12px] text-red-600">{loginErr}</p>}
          <button
            onClick={login}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            登录
          </button>
          <div className="mt-5 flex items-center gap-1.5 border-t border-zinc-100 pt-4 text-[10px] text-zinc-400">
            <Lock size={11} /> 会话由服务端签发，所有管理端点逐次校验
          </div>
        </div>
      </main>
    );
  }

  const todos = buildTodos(status);

  function renderTab() {
    switch (tab) {
      case 'overview':
        return <Overview status={status} refreshToken={refreshToken} onNavigate={navigate} />;
      case 'todos':
        return <Todos status={status} onNavigate={navigate} />;
      case 'agent':
        return <AgentEcosystem mode="usage" refreshToken={refreshToken} onNavigate={navigate} />;
      case 'discovery':
        return <AgentEcosystem mode="discovery" refreshToken={refreshToken} onNavigate={navigate} />;
      case 'orders':
        return <Orders status={status} refreshToken={refreshToken} onNavigate={navigate} />;
      case 'ai':
        return <AiAssistant refreshToken={refreshToken} />;
      case 'secrets':
        return <Secrets refreshToken={refreshToken} />;
      case 'smartmoney':
        return <SmartMoney refreshToken={refreshToken} />;
      case 'site':
        return (
          <div className="space-y-4">
            <PageHeader title="站点内容与 SEO" subtitle="站点基础信息、SEO 关键词与营销横幅；修改后立即写入数据文件并记入操作日志。" />
            <div className="admin-light rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-1 text-[13px] font-semibold text-zinc-800">站点设置</h2>
              <ConfigModules tab="settings" />
            </div>
            <div className="admin-light rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-1 text-[13px] font-semibold text-zinc-800">营销横幅</h2>
              <ConfigModules tab="banners" />
            </div>
          </div>
        );
      default: {
        const legacy = LEGACY[tab];
        if (legacy) {
          return (
            <div className="admin-light rounded-xl border border-zinc-200 bg-white p-4">
              <ConfigModules tab={legacy} />
            </div>
          );
        }
        return <Overview status={status} refreshToken={refreshToken} onNavigate={navigate} />;
      }
    }
  }

  return (
    <main className="admin-light min-h-screen bg-zinc-50 text-zinc-900">
      <AdminNav
        tab={tab}
        onTab={navigate}
        alertCount={todos.length}
        onRefresh={refresh}
        refreshing={false}
        onLogout={logout}
      />
      <div className="pt-14 lg:pl-[232px]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-7">{renderTab()}</div>
      </div>
      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-lg bg-zinc-900 px-4 py-2.5 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
