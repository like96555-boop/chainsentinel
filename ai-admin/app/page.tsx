'use client';

import { useEffect, useState } from 'react';

type Config = {
  enabled: boolean;
  model: string;
  temperature: number;
  greeting: string;
  systemPrompt: string;
  faqItems: string[];
  quickQuestions: string[];
};

const EMPTY: Config = {
  enabled: true,
  model: 'kimi-for-coding',
  temperature: 0.5,
  greeting: '',
  systemPrompt: '',
  faqItems: [],
  quickQuestions: [],
};

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [cfg, setCfg] = useState<Config>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/config');
        if (r.status === 401) return setAuthed(false);
        if (r.ok) {
          const j = await r.json();
          setCfg(j.config);
          setAuthed(true);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  async function login() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        const c = await fetch('/api/config');
        if (c.ok) setCfg((await c.json()).config);
        setAuthed(true);
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg({ ok: false, text: j.error || '登录失败' });
      }
    } catch {
      setMsg({ ok: false, text: '网络错误' });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (r.ok) {
        setMsg({ ok: true, text: '✅ 已保存，主站 AI 客服约 30 秒内生效（配置缓存）' });
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg({ ok: false, text: j.error || '保存失败' });
      }
    } catch {
      setMsg({ ok: false, text: '网络错误' });
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));

  function editListItem(key: 'faqItems' | 'quickQuestions', idx: number, v: string) {
    setCfg((c) => ({ ...c, [key]: c[key].map((x, i) => (i === idx ? v : x)) }));
  }
  function addListItem(key: 'faqItems' | 'quickQuestions') {
    setCfg((c) => ({ ...c, [key]: [...c[key], ''] }));
  }
  function removeListItem(key: 'faqItems' | 'quickQuestions', idx: number) {
    setCfg((c) => ({ ...c, [key]: c[key].filter((_, i) => i !== idx) }));
  }

  if (authed === null) {
    return (
      <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 380, textAlign: 'center' }}>
          <p style={{ fontSize: 28 }}>🛡️</p>
          <h1 style={{ fontSize: 20, margin: '8px 0 4px' }}>链哨 · AI 客服管理台</h1>
          <p className="hint">独立部署单元 · 配置写入 data/ai-config.json</p>
          <div style={{ textAlign: 'left' }}>
            <span className="label">管理密码（根 .env 的 AI_ADMIN_PASSWORD）</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={login} disabled={busy || !password}>
              {busy ? '登录中…' : '登录'}
            </button>
          </div>
          {msg && <p style={{ marginTop: 12, fontSize: 13, color: msg.ok ? '#4ade80' : '#f87171' }}>{msg.text}</p>}
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 380, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '8px 0 12px' }}>登录</h1>
          <input type="password" placeholder="管理密码" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={login} disabled={busy || !password}>
              {busy ? '登录中…' : '登录'}
            </button>
          </div>
          {msg && <p style={{ marginTop: 12, fontSize: 13, color: '#f87171' }}>{msg.text}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22 }}>🤖 AI 客服配置中心</h1>
          <p className="hint">独立管理台（端口 3001）· 修改实时写入 data/ai-config.json · 主站客服读取（30s 缓存）</p>
        </div>
        <button className="btn-ghost" onClick={() => { setAuthed(false); setPassword(''); }}>退出登录</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label className="toggle">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          <span style={{ color: cfg.enabled ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>{cfg.enabled ? 'AI 客服已启用' : 'AI 客服已停用'}</span>
        </label>
        <span className="hint">停用后主站客服回复"已由管理员停用"（防 AI 乱说话的一键开关）</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="label">模型</span>
        <input value={cfg.model} onChange={(e) => set('model', e.target.value)} placeholder="kimi-for-coding" />
        <span className="label">Temperature（0~2，越低越严谨）</span>
        <input type="number" step="0.1" min="0" max="2" value={cfg.temperature} onChange={(e) => set('temperature', Number(e.target.value))} />
        <span className="label">客服问候语（打开聊天窗时显示）</span>
        <input value={cfg.greeting} onChange={(e) => set('greeting', e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="label">System Prompt（角色设定）</span>
        <textarea value={cfg.systemPrompt} onChange={(e) => set('systemPrompt', e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label" style={{ margin: 0 }}>FAQ 知识库（追加进 System Prompt，模型优先引用）</span>
          <button className="btn-ghost" onClick={() => addListItem('faqItems')}>+ 添加</button>
        </div>
        {cfg.faqItems.length === 0 && <p className="hint">暂无知识条目，添加后 AI 回答更准确</p>}
        {cfg.faqItems.map((item, i) => (
          <div className="row" key={i} style={{ marginTop: 10 }}>
            <textarea style={{ minHeight: 60 }} value={item} onChange={(e) => editListItem('faqItems', i, e.target.value)} />
            <button className="btn-danger" onClick={() => removeListItem('faqItems', i)}>删</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label" style={{ margin: 0 }}>快捷问题（聊天窗底部按钮）</span>
          <button className="btn-ghost" onClick={() => addListItem('quickQuestions')}>+ 添加</button>
        </div>
        {cfg.quickQuestions.map((q, i) => (
          <div className="row" key={i} style={{ marginTop: 10 }}>
            <input value={q} onChange={(e) => editListItem('quickQuestions', i, e.target.value)} />
            <button className="btn-danger" onClick={() => removeListItem('quickQuestions', i)}>删</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? '保存中…' : '💾 保存配置'}
        </button>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? '#4ade80' : '#f87171' }}>{msg.text}</span>}
      </div>
    </main>
  );
}
