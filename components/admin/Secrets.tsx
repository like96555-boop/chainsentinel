'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { getJson } from './adminData';
import { Button, Card, ErrorNote, PageHeader, inputCls } from './ui';

interface MaskedSecret {
  key: string;
  configured: boolean;
  source: 'store' | 'env' | 'none';
  masked: string;
}

const KEY_LABELS: Record<string, string> = {
  KIMI_API_KEY: 'Kimi 模型密钥',
  KIMI_BASE_URL: 'Kimi 接口地址',
  TRONGRID_API_KEY: 'TronGrid API Key',
};

export default function Secrets({ refreshToken }: { refreshToken: number }) {
  const [secrets, setSecrets] = useState<MaskedSecret[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await getJson<{ secrets: MaskedSecret[] }>('/api/admin/secrets');
      setSecrets(j.secrets || []);
      setError('');
    } catch { setError('密钥清单读取失败。'); }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  async function save() {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(edits)) if (v.trim()) payload[k] = v;
    if (Object.keys(payload).length === 0) { setMsg('请先填写要更新的密钥值'); return; }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) setError(j?.error || '保存失败');
      else { setSecrets(j.secrets || []); setEdits({}); setMsg('已加密保存，可在待办与告警中确认状态变化。'); }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="密钥与访问权限" subtitle="密钥以 AES-256-GCM 加密存储于 data/secrets.enc.json；界面只显示掩码，绝不回传明文。" />
      {error && <ErrorNote text={error} />}

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-zinc-400" />
          <h2 className="text-[14px] font-semibold text-zinc-900">服务端密钥</h2>
        </div>
        <div className="mt-5 space-y-4">
          {secrets.length === 0 && <p className="text-[12px] text-zinc-500">正在读取…</p>}
          {secrets.map((s) => (
            <div key={s.key} className="grid gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-center">
              <div>
                <p className="font-mono text-[12px] font-medium text-zinc-800">{s.key}</p>
                <p className="text-[11px] text-zinc-500">{KEY_LABELS[s.key] || '服务密钥'}</p>
              </div>
              <input
                type="password"
                value={edits[s.key] || ''}
                onChange={(e) => { setEdits({ ...edits, [s.key]: e.target.value }); setMsg(''); }}
                placeholder={s.configured ? `当前：${s.masked}（${s.source === 'store' ? '后台配置' : '环境变量'}）` : '未配置，输入新值'}
                className={`font-mono text-[12px] ${inputCls}`}
              />
              <span className={`text-[11px] ${s.configured ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {s.configured ? '● 已配置' : '○ 未配置'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy}><Save size={14} /> 加密保存</Button>
          {msg && <span className="text-[12px] text-emerald-700">{msg}</span>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-zinc-900">访问权限说明</h2>
        <div className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-zinc-600">
          <p>· 后台会话由服务端签发 HttpOnly Cookie，所有 <span className="font-mono">/api/admin/*</span> 端点逐次校验。</p>
          <p>· 密钥修改会写入操作日志；公开端点不下发任何密钥或提示词全文。</p>
          <p>· 撤除第二套后台后，AI 客服配置已并入本后台的「系统」分组，不再有独立密码与独立域名。</p>
        </div>
      </Card>
    </div>
  );
}
